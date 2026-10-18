# Pipeline DevSecOps : GitHub Actions + Azure

## Flux
```
push/PR -> Gitleaks -> Tests + npm audit + SonarQube (Quality Gate) -> Trivy config
        -> Build Docker -> Trivy image (bloque CRITICAL/HIGH) -> SBOM -> Push ACR (tag = SHA)
        -> Deploy staging -> OWASP ZAP (DAST) -> [approbation manuelle] -> Deploy prod
```

## Justification des choix
| Choix | Pourquoi | Alternative |
|---|---|---|
| GitHub Actions | Integre au repo, managé, pas de serveur a maintenir, marketplace riche | Jenkins (plus de controle, mais a heberger) |
| Gitleaks | Detecte les secrets avant qu'ils n'atteignent l'image ou le registry | TruffleHog |
| SonarQube + Quality Gate | SAST + qualite du code, bloque si seuil non respecte | CodeQL, Semgrep |
| npm audit (SCA) | Vulnerabilites des dependances applicatives | Dependabot, Snyk |
| Trivy (config + image + SBOM) | Un seul outil open source pour image, IaC et SBOM, rapide | Grype, Checkov (IaC) |
| Dockerfile multi-stage, alpine, non-root | Surface d'attaque reduite, moins de CVE | distroless |
| ACR | Registry natif Azure, integre a l'identite Azure | GHCR |
| Tag = SHA du commit | Tracabilite et rollback exact, jamais `latest` | tag semver |
| OIDC (azure/login) | Aucun secret Azure long duree stocke dans GitHub | Service principal + secret |
| Azure Container Apps | Serverless conteneurs, simple et peu couteux pour un projet | AKS + ArgoCD (GitOps, plus complexe) |
| Staging + ZAP (DAST) | Teste l'app en cours d'execution, complete le SAST | Nikto |
| Environment "production" avec reviewers | Validation humaine avant la prod | Pull Request sur repo de manifests |
| `--ignore-unfixed` | Evite de bloquer sur des CVE sans correctif disponible | .trivyignore avec expiration |

## Setup Azure (une seule fois)
```bash
RG=rg-devsecops; LOC=westeurope; ACR=monacr  # nom unique globalement

az group create -n $RG -l $LOC
az acr create -n $ACR -g $RG --sku Basic
az containerapp env create -n env-devsecops -g $RG -l $LOC

# Apps (image de demo au depart)
for APP in myapp-staging myapp-prod; do
  az containerapp create -n $APP -g $RG --environment env-devsecops \
    --image mcr.microsoft.com/k8se/quickstart:latest --target-port 3000 --ingress external
done

# Identite OIDC pour GitHub
APP_ID=$(az ad app create --display-name gh-devsecops --query appId -o tsv)
az ad sp create --id $APP_ID
SUB=$(az account show --query id -o tsv)
az role assignment create --assignee $APP_ID --role Contributor \
  --scope /subscriptions/$SUB/resourceGroups/$RG
az role assignment create --assignee $APP_ID --role AcrPush \
  --scope $(az acr show -n $ACR --query id -o tsv)

# Autoriser le repo GitHub (remplace OWNER/REPO)
az ad app federated-credential create --id $APP_ID --parameters '{
  "name":"gh-main","issuer":"https://token.actions.githubusercontent.com",
  "subject":"repo:OWNER/REPO:ref:refs/heads/main","audiences":["api://AzureADTokenExchange"]}'
# Ajoute aussi un credential pour chaque environment: repo:OWNER/REPO:environment:staging / production
```
Ajoute aussi : Container Apps doit pouvoir tirer depuis ACR
(`az containerapp registry set -n <app> -g $RG --server $ACR.azurecr.io --identity system`
apres `az containerapp identity assign --system-assigned` et le role `AcrPull`).

## Secrets GitHub (Settings > Secrets)
`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `SONAR_TOKEN`, `SONAR_HOST_URL`

## Environments GitHub
Cree `staging` et `production` ; sur `production`, active **Required reviewers**.

## Avant de lancer
- Remplace `ACR_NAME` dans le workflow par ton nom d'ACR.
- Verifie les versions des actions (Trivy, ZAP, Sonar) sur leur page GitHub.
- L'app doit avoir `server.js`, un endpoint `/health` et un `package.json`.