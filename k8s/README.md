# Kubernetes Deployment

Kubernetes manifests untuk WhatsApp CRM Platform.

## Files

- `deployment.yaml` - Deployments untuk app, service, workers, dan Redis
- `service.yaml` - Service definitions
- `ingress.yaml` - Ingress dengan SSL/TLS
- `configmap.yaml` - Configuration
- `secret.yaml.example` - Secret template (jangan commit yang asli!)
- `hpa.yaml` - Horizontal Pod Autoscaling
- `monitoring/` - Prometheus dan Grafana configs

## Quick Start

### 1. Create Namespace
```bash
kubectl create namespace whatsapp-crm
kubectl config set-context --current --namespace=whatsapp-crm
```

### 2. Create Secrets
```bash
kubectl create secret generic whatsapp-crm-secrets \
  --from-literal=supabase-url="https://your-project.supabase.co" \
  --from-literal=supabase-anon-key="your-anon-key" \
  --from-literal=supabase-service-key="your-service-role-key" \
  --from-literal=jwt-secret="your-jwt-secret" \
  --from-literal=nextauth-secret="your-nextauth-secret"
```

### 3. Update ConfigMap
Edit `configmap.yaml` dengan values yang sesuai, lalu apply:
```bash
kubectl apply -f configmap.yaml
```

### 4. Deploy Services
```bash
# Deploy semua resources
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml
kubectl apply -f hpa.yaml
```

### 5. Verify Deployment
```bash
# Check pods
kubectl get pods

# Check services
kubectl get svc

# Check ingress
kubectl get ingress

# Check HPA
kubectl get hpa

# Check logs
kubectl logs -f deployment/whatsapp-crm-app
```

## Scaling

### Manual Scaling
```bash
kubectl scale deployment whatsapp-crm-app --replicas=5
```

### Auto Scaling (HPA)
HPA sudah configured di `hpa.yaml`:
- App: 3-10 replicas (CPU 70%, Memory 80%)
- Service: 2-5 replicas (CPU 75%, Memory 85%)
- Workers: 2-8 replicas (CPU 70%)

## Monitoring

### Deploy Monitoring Stack
```bash
kubectl create namespace monitoring
kubectl apply -f monitoring/prometheus-config.yaml
```

### Access Dashboards
```bash
# Prometheus
kubectl port-forward -n monitoring svc/prometheus 9090:9090

# Grafana
kubectl port-forward -n monitoring svc/grafana 3001:3000
```

## Troubleshooting

### Check Pod Status
```bash
kubectl get pods
kubectl describe pod <pod-name>
```

### Check Logs
```bash
kubectl logs -f deployment/whatsapp-crm-app
kubectl logs -f deployment/whatsapp-crm-service
kubectl logs -f deployment/whatsapp-crm-workers
```

### Check Events
```bash
kubectl get events --sort-by='.lastTimestamp'
```

### Restart Deployment
```bash
kubectl rollout restart deployment/whatsapp-crm-app
```

## Updates

### Rolling Update
```bash
# Update image
kubectl set image deployment/whatsapp-crm-app \
  app=registry.example.com/whatsapp-crm-app:v2.0.0

# Check rollout status
kubectl rollout status deployment/whatsapp-crm-app
```

### Rollback
```bash
kubectl rollout undo deployment/whatsapp-crm-app
```

## Resource Requirements

### Minimum:
- CPU: 2 cores
- Memory: 4 GB
- Storage: 50 GB

### Recommended:
- CPU: 4+ cores
- Memory: 8+ GB
- Storage: 100+ GB

## Notes

- Ingress requires nginx-ingress-controller
- SSL certificates managed by cert-manager
- Persistent volumes required for Redis and WhatsApp auth
- HPA requires metrics-server
