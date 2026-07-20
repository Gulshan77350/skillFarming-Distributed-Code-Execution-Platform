# Kubernetes Deployment

These manifests describe how this platform would be deployed to a production Kubernetes cluster.

## Apply order

```bash
kubectl apply -f secrets.yaml
kubectl apply -f postgres.yaml
kubectl apply -f gateway.yaml
kubectl apply -f execution-worker.yaml
```

## Design notes

- **API Gateway**: 2 replicas behind a LoadBalancer service for high availability
- **Execution Worker**: 3 replicas — since code execution is the bottleneck (each submission takes several seconds), horizontally scaling workers increases submission throughput without touching the gateway
- **Postgres**: single instance with a PersistentVolumeClaim (production would use a managed DB like RDS/Cloud SQL instead)
- **Secrets**: DB password and JWT secret stored in a Kubernetes Secret, injected via `envFrom`
- **Docker socket mount**: execution workers need access to the host's Docker daemon to spin up sandboxed containers — in a real cluster this would be replaced with gVisor or Kata Containers for stronger isolation
