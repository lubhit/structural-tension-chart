# Tekton CI/CD on GKE → Cloud Run — Resume Notes

## What this is

Auto-deploy pipeline: `git push` to `main` on the GitHub repo triggers a
Tekton PipelineRun on GKE that builds the Vite/React app with Kaniko,
pushes to Artifact Registry, and rolls out a new Cloud Run revision.

## Local workstation paths

| Laptop | Hostname | Project path | Notes |
|---|---|---|---|
| Ford laptop | `H2GQGQJ2RD` | `~/Code/structural-tension-chart` | Corporate-managed; VPC SC blocks personal-account GCP API calls when on Ford network/VPN. Use a non-Ford network for `gcloud container clusters create` etc. |
| Personal Mac | `MGC1GQGQJ2RD` | `~/structural-tension-chart` (verify) | Originally used for setup. No network restrictions. |

Always confirm `gcloud auth list` shows `lubhit@gmail.com` as active before running anything that touches the personal GCP project.

## Names and IDs

| Thing | Value |
|---|---|
| GCP project | `structuretensionchart` |
| GitHub repo | `https://github.com/lubhit/structural-tension-chart` (public) |
| GKE cluster | `tekton-ci` in zone `us-central1-a`, 2x e2-medium |
| Cluster workload pool | `structuretensionchart.svc.id.goog` |
| Artifact Registry repo | `tension-app` in `us-central1` |
| Image | `us-central1-docker.pkg.dev/structuretensionchart/tension-app/tension-tool` |
| Cloud Run service | `tension-tool` in `us-central1` |
| GCP service account | `tekton-deployer@structuretensionchart.iam.gserviceaccount.com` |
| GCP roles | `run.admin`, `iam.serviceAccountUser`, `artifactregistry.writer`, `storage.admin` |
| K8s namespace | `default` |
| K8s SA for builds | `tekton-deployer` (Workload Identity) |
| K8s SA for triggers | `tekton-triggers-sa` |
| Webhook secret | REGENERATE on each rebuild — `openssl rand -hex 32` |

## Bring everything back up after `gcloud container clusters delete`

```bash
# 1. Cluster
gcloud config set project structuretensionchart
gcloud container clusters create tekton-ci \
  --zone us-central1-a --num-nodes=2 --machine-type=e2-medium \
  --disk-size=30 --disk-type=pd-standard --release-channel=regular \
  --workload-pool=structuretensionchart.svc.id.goog --enable-ip-alias
gcloud container clusters get-credentials tekton-ci --zone us-central1-a

# 2. Tekton
kubectl apply -f https://storage.googleapis.com/tekton-releases/pipeline/latest/release.yaml
kubectl apply -f https://storage.googleapis.com/tekton-releases/triggers/latest/release.yaml
kubectl apply -f https://storage.googleapis.com/tekton-releases/triggers/latest/interceptors.yaml
kubectl wait --for=condition=Available --timeout=300s -n tekton-pipelines deployment/tekton-pipelines-controller
kubectl wait --for=condition=Available --timeout=300s -n tekton-pipelines deployment/tekton-pipelines-webhook
kubectl wait --for=condition=Available --timeout=300s -n tekton-pipelines deployment/tekton-triggers-controller

# 3. KSA + Workload Identity (GSA already exists from before)
kubectl create serviceaccount tekton-deployer
kubectl annotate serviceaccount tekton-deployer \
  iam.gke.io/gcp-service-account=tekton-deployer@structuretensionchart.iam.gserviceaccount.com

# 4. Catalog tasks + custom Task + Pipeline
kubectl apply -f https://raw.githubusercontent.com/tektoncd/catalog/main/task/git-clone/0.9/git-clone.yaml
kubectl apply -f https://raw.githubusercontent.com/tektoncd/catalog/main/task/kaniko/0.6/kaniko.yaml
# Apply the gcloud-run-deploy Task and tension-tool-build-deploy Pipeline
# (YAML in the original chat session — paste from there or recreate)

# 5. Webhook secret + Triggers
WEBHOOK_TOKEN=$(openssl rand -hex 32)
kubectl create secret generic github-webhook-secret \
  --from-literal=secretToken="$WEBHOOK_TOKEN"
echo "New token for GitHub webhook: $WEBHOOK_TOKEN"
# Apply the triggers manifest (RBAC + EventListener + bindings)

# 6. Get new EventListener IP and update GitHub webhook
kubectl get svc el-github-listener -w
# Update https://github.com/lubhit/structural-tension-chart/settings/hooks
# - Payload URL: http://<NEW_IP>:8080
# - Secret: the WEBHOOK_TOKEN you just generated
```

## Footguns we already hit (don't repeat)

1. **e2-small / single-node clusters can't fit Tekton**. Use 2 nodes minimum or a bigger machine.
2. **PVC perms**: PipelineRuns need `podTemplate.securityContext.fsGroup: 65532` so git-clone can write.
3. **Private repos need creds**. We made the repo public. To go private, mount a GitHub PAT on the basic-auth workspace.
4. **Trigger ClusterRole needs both `interceptors` AND `clusterinterceptors`**. Many tutorials only list the latter — Tekton Triggers v0.32+ needs both.
5. **VPC SC blocks personal accounts on Ford-managed networks**. Do this work on a personal machine, not the corporate laptop.

## Running the pipeline

Manual run: `kubectl create -f <pipelinerun.yaml>`
Watch: `kubectl get pipelineruns -w`
Logs: `kubectl logs -l tekton.dev/pipelineRun=<name> --all-containers --tail=200`

## Costs and shutdown

Cluster idles at ~$70/mo (2x e2-medium + LoadBalancer). Kill it with:
```bash
gcloud container clusters delete tekton-ci --zone us-central1-a
```
The Cloud Run service, Artifact Registry, and IAM all survive. Cloud Run
keeps serving the app independently of GKE.
