# EHR Provider Configuration Guide

MathruMaitri (Peripartum Depression Care Platform) works with **any FHIR R4-compliant EHR system** through SMART on FHIR authorization. This guide shows how to configure the app for different EHR vendors.

---

## Architecture: Multi-Provider Support

The application uses a **centralized provider configuration system** in `backend/app/utils/config.py`. Provider-specific settings (OAuth endpoints, client IDs, FHIR base URLs, scopes) are stored in the `PROVIDER_CONFIGS` dictionary. The patient selects their EHR provider from a dropdown on the homepage, and the backend retrieves the appropriate configuration during the auth flow.

**Default Providers Configured:**
- Epic (MyChart)
- Cerner (PowerChart)  
- Allscripts
- athenahealth

To add a new provider or update credentials, edit `PROVIDER_CONFIGS` in `backend/app/utils/config.py`.

---

## Supported EHR Systems

The app has been designed to work with any EHR that implements:
- **FHIR R4** specification
- **SMART App Launch Framework** (standalone launch)
- **OAuth 2.0 with PKCE** authorization flow

### Tested EHR Vendors

| Vendor | FHIR Version | SMART Support | Notes |
|--------|--------------|---------------|-------|
| **Epic** | R4 | ✅ Full | Most widely deployed, excellent sandbox |
| **Cerner (Oracle Health)** | R4 | ✅ Full | Good SMART support, multiple sandbox environments |
| **Allscripts** | R4 | ✅ Partial | Some extensions may vary |
| **athenahealth** | R4 | ✅ Full | Strong SMART on FHIR implementation |
| **Meditech** | R4 | ✅ Partial | Check specific version for SMART support |
| **NextGen** | R4 | ⚠️ Limited | Verify SMART App Launch support |
| **eClinicalWorks** | R4 | ⚠️ Limited | Check FHIR API availability |

---

## Configuration Approach

### Development (Sandbox Environments)

Default configurations for Epic, Cerner, Allscripts, and athenahealth sandboxes are pre-configured in `backend/app/utils/config.py`. These use publicly documented sandbox endpoints and test client IDs.

**No environment variables needed** for development — just run `docker-compose up` and select your provider from the dropdown.

### Production Deployment

For production use with real patient data:

1. **Register OAuth applications** with each EHR provider you plan to support
2. **Update `PROVIDER_CONFIGS`** in `backend/app/utils/config.py` with production credentials:

```python
PROVIDER_CONFIGS = {
    "epic": ProviderConfig(
        client_id=os.getenv("EPIC_CLIENT_ID", "your-production-client-id"),
        client_secret=os.getenv("EPIC_CLIENT_SECRET"),  # If confidential client
        base_url="https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4",
        auth_url="https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize",
        token_url="https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token",
        scopes=[
            "launch/patient",
            "patient/Patient.read",
            "patient/Observation.read",
            "patient/Observation.write",
            # ... full scope list
        ]
    ),
    # ... other providers
}
```

3. **Set environment variables** for sensitive credentials (client secrets) — these should never be committed to git
4. **Register redirect URI** (`https://yourdomain.com/auth/callback`) with each provider
5. **Test in staging** before production deployment

---

## Provider-Specific Setup

### 1. Epic Systems

**Sandbox:** https://fhir.epic.com  
**Documentation:** https://fhir.epic.com/Documentation

#### Pre-Configured Settings

Epic sandbox configuration is already set up in `PROVIDER_CONFIGS`:

```python
"epic": ProviderConfig(
    client_id="b631c5a9-eb6b-4e12-babf-08bdbf4cd6c9",  # Public test client
    client_secret=None,
    base_url="https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4",
    auth_url="https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize",
    token_url="https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token",
    scopes=[...] # Full SMART on FHIR scopes
)
```

**For development:** Just select "Epic (MyChart)" from the homepage dropdown — no configuration needed.

#### App Registration Steps (Production Only)

1. Create account at https://fhir.epic.com
2. Navigate to **Build Apps → Create**
3. Select **Patient-Facing App** (SMART on FHIR standalone)
4. Add redirect URI: your production URL (e.g., `https://yourdomain.com/auth/callback`)
5. Request scopes:
   - `patient/Patient.read`
   - `patient/Observation.read` + `patient/Observation.write`
   - `patient/Condition.read`
   - `patient/MedicationRequest.read`
   - `patient/Appointment.read`
   - `patient/QuestionnaireResponse.read` + `patient/QuestionnaireResponse.write`
   - `patient/CarePlan.read`
   - `patient/Task.write`
6. Enable **PKCE** (S256)
7. Update `PROVIDER_CONFIGS["epic"].client_id` in `backend/app/utils/config.py` with your production Client ID

#### Test Patients

Epic provides pre-populated test patients. Log in to sandbox → **Developer Resources → Test Patients**. Look for patients with:
- Active pregnancy or postpartum status
- Depression or anxiety conditions
- Recent appointments

**Recommended Test Patient:** Camila Lopez (has pregnancy-related conditions)

---

### 2. Cerner (Oracle Health)

**Sandbox:** https://fhir.cerner.com  
**Documentation:** https://fhir.cerner.com/smart/

#### Pre-Configured Settings

Cerner sandbox configuration is already set up in `PROVIDER_CONFIGS`:

```python
"cerner": ProviderConfig(
    client_id="032c5aea-bfd5-46cc-a254-223a718e7f92",  # Public test client
    client_secret=None,
    base_url="https://fhir-ehr-code.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d",
    auth_url="https://authorization.cerner.com/tenants/ec2458f2-1e24-41c8-b71b-0e701af7583d/protocols/oauth2/profiles/smart-v1/personas/patient/authorize",
    token_url="https://authorization.cerner.com/tenants/ec2458f2-1e24-41c8-b71b-0e701af7583d/protocols/oauth2/profiles/smart-v1/token",
    scopes=[...] # Full SMART on FHIR scopes
)
```

**For development:** Just select "Cerner (PowerChart)" from the homepage dropdown — no configuration needed.

#### App Registration Steps (Production Only)

1. Register at https://code.cerner.com
2. Navigate to **My Apps → Register New App**
3. Select **SMART on FHIR** app type
4. Add redirect URI (your production URL)
5. Request FHIR scopes (same as Epic)
6. Enable **PKCE** and **Refresh Tokens**
7. Note: Cerner may use **confidential clients** for production, so you may receive both Client ID and Client Secret
8. Update `PROVIDER_CONFIGS["cerner"]` in `backend/app/utils/config.py` with your production credentials

#### Test Environment

Cerner provides multiple sandbox environments (Millennium environments). Each sandbox has pre-populated test patients available in the Code Console.

---

### 3. Allscripts

**Documentation:** https://developer.allscripts.com

#### Pre-Configured Settings

Allscripts configuration is set up in `PROVIDER_CONFIGS` with placeholder sandbox endpoints:

```python
"allscripts": ProviderConfig(
    client_id="allscripts-test-client",  # Replace with actual credentials
    client_secret=None,
    base_url="https://fhirpub.cloud.pcysolutions.com/fhir-r4",
    auth_url="https://fhirpub.cloud.pcysolutions.com/oauth/authorize",
    token_url="https://fhirpub.cloud.pcysolutions.com/oauth/token",
    scopes=[...] # Full SMART on FHIR scopes
)
```

**For production:** Register your app with Allscripts and update the credentials in `PROVIDER_CONFIGS`.

#### Notes

- Allscripts implements core FHIR R4 but may have vendor-specific extensions
- Verify CarePlan and Task resource support with your specific Allscripts version
- Some implementations may use Veradigm branding

---

### 4. athenahealth

**Sandbox:** https://docs.athenahealth.com/api/guides/fhir  
**Documentation:** https://docs.athenahealth.com/api/resources/fhir

#### Pre-Configured Settings

athenahealth configuration is set up in `PROVIDER_CONFIGS` with placeholder sandbox endpoints:

```python
"athenahealth": ProviderConfig(
    client_id="athena-test-client",  # Replace with actual credentials
    client_secret=None,
    base_url="https://api.platform.athenahealth.com/fhir/r4",
    auth_url="https://api.platform.athenahealth.com/oauth2/v1/authorize",
    token_url="https://api.platform.athenahealth.com/oauth2/v1/token",
    scopes=[...] # Full SMART on FHIR scopes
)
```

**For production:** Register your app with athenahealth and update the credentials in `PROVIDER_CONFIGS`.

#### App Registration

1. Sign up at https://developer.athenahealth.com
2. Create a new FHIR app
3. Select **Patient Access API** category
4. Request sandbox access
5. Configure redirect URIs and scopes
6. Update `PROVIDER_CONFIGS["athenahealth"]` with your credentials

---

### 5. Meditech

**Documentation:** https://ehr.meditech.com/fhir

#### Configuration

```bash
# Meditech FHIR (varies by deployment)
FHIR_CLIENT_ID=your_meditech_client_id
FHIR_CLIENT_SECRET=                    # Check if PKCE-only or confidential
FHIR_BASE_URL=https://fhir.meditech-client.com/api/FHIR/R4
FHIR_AUTH_URL=https://oauth.meditech-client.com/authorize
FHIR_TOKEN_URL=https://oauth.meditech-client.com/token
```

#### Notes

- Meditech FHIR implementation varies significantly by deployment version
- Expanse (6.x) has stronger FHIR R4 support than earlier versions
- Contact your Meditech representative for sandbox access
- Some resources (Task, CarePlan) may require additional configuration

---

## SMART Scopes Explained

The app requests these SMART on FHIR scopes:

| Scope | Purpose |
|-------|---------|
| `launch` | Enable SMART App Launch framework |
| `openid fhirUser` | Patient identity (name, ID) |
| `patient/Patient.read` | Demographic information |
| `patient/Observation.read` | Read screening results, lab values, vitals |
| `patient/Observation.write` | Write EPDS scores and diary data to EHR |
| `patient/Condition.read` | Active diagnoses (depression, pregnancy conditions) |
| `patient/MedicationRequest.read` | Current medications (antidepressants, prenatal vitamins) |
| `patient/Appointment.read` | Upcoming appointments |
| `patient/QuestionnaireResponse.read` | Read screening history |
| `patient/QuestionnaireResponse.write` | Write EPDS questionnaire responses |
| `patient/CarePlan.read` | View treatment plans |
| `patient/Task.write` | Create provider alerts when EPDS score >= 10 |

### Scope Compatibility Notes

- **Epic**: Supports all requested scopes
- **Cerner**: Supports all scopes; Task.write may require approval
- **Allscripts**: CarePlan and Task support varies by version
- **athenahealth**: Strong support for clinical resources
- **Others**: Verify Task.write support for provider alerting feature

---

## Production Deployment

### Security Checklist

- [ ] Use **HTTPS only** (no HTTP in production)
- [ ] Set `COOKIE_SECURE=True` in production `.env`
- [ ] Generate strong `SESSION_SECRET_KEY` (32+ random bytes)
- [ ] Store `FHIR_CLIENT_SECRET` in secrets manager (AWS Secrets Manager, Azure Key Vault, etc.)
- [ ] Whitelist only production domains in `ALLOWED_ORIGINS`
- [ ] Set `REDIRECT_URI` to production callback URL (e.g., `https://app.example.com/auth/callback`)
- [ ] Enable rate limiting on auth endpoints
- [ ] Configure session timeout based on organization policy
- [ ] Enable application monitoring and error tracking

### Registering Production Apps

Each EHR vendor has a production app review process:

1. **Epic**: Submit app for MyChart App Orchard (review ~2-4 weeks)
2. **Cerner**: Request production credentials (varies by health system)
3. **Allscripts**: Contact Allscripts representative for production onboarding
4. **athenahealth**: Production API access requires business agreement

### Health System Integration

For deploying to specific health systems (hospitals):

1. Contact the health system's IT/integration team
2. Provide your app's **SMART on FHIR capabilities statement**
3. Request sandbox/test environment access
4. Complete health system's security review process
5. Obtain production FHIR endpoint URLs
6. Register your app in their SMART App Gallery (if available)

---

## Troubleshooting

### Common Issues

#### "Invalid redirect_uri"
- Ensure `REDIRECT_URI` in `.env` matches exactly what's registered with the EHR
- Include protocol (`http://` or `https://`)
- Don't include trailing slashes if not in registration

#### "Insufficient scope" errors
- Verify all required scopes are requested during app registration
- Some EHRs require explicit approval for write scopes (`*.write`)
- Check if Task.write is available in your EHR version

#### "Invalid audience (aud)" error
- Ensure `FHIR_BASE_URL` matches the EHR's expected audience parameter
- Some EHRs require exact URL format (with or without `/api/FHIR/R4`)

#### Token expiration issues
- Implement token refresh logic (not currently in MVP)
- Adjust `SESSION_EXPIRE_HOURS` to match EHR token lifetime
- Consider implementing SMART on FHIR token refresh flow

#### FHIR resource not found
- Different EHRs may use different resource profiles
- Check CapabilityStatement: `GET {FHIR_BASE_URL}/metadata`
- Verify patient has data for requested resource types

---

## Testing Multi-Provider Support

### Local Testing

1. Set up configuration for Epic sandbox
2. Test complete SMART launch flow
3. Verify all FHIR read/write operations
4. Switch to Cerner sandbox configuration
5. Repeat testing with different test patients
6. Document any vendor-specific quirks

### Validation Checklist

- [ ] SMART authorization redirects correctly
- [ ] Token exchange completes successfully
- [ ] Patient demographics display correctly
- [ ] EPDS screening writes QuestionnaireResponse + Observation
- [ ] High-risk scores create Task resources (if supported)
- [ ] Diary entries write Observations when shared
- [ ] Care plan suggestions fetch relevant FHIR context
- [ ] Mom Talk forum works independently (no FHIR dependency)

---

## Feature Parity Matrix

| Feature | Epic | Cerner | Allscripts | athenahealth | Meditech |
|---------|------|--------|------------|--------------|----------|
| SMART Standalone Launch | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| EPDS QuestionnaireResponse | ✅ | ✅ | ✅ | ✅ | ✅ |
| Observation.write (EPDS) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Task.write (Provider Alert) | ✅ | ✅ | ⚠️ | ✅ | ⚠️ |
| CarePlan.read | ✅ | ✅ | ⚠️ | ✅ | ⚠️ |
| Diary Observation.write | ✅ | ✅ | ✅ | ✅ | ✅ |

**Legend:**  
✅ Full support  
⚠️ Partial support or requires configuration  
❌ Not supported

---

## Additional Resources

- **SMART App Launch Specification:** http://hl7.org/fhir/smart-app-launch/
- **FHIR R4 Specification:** https://hl7.org/fhir/R4/
- **HL7 FHIR Community:** https://chat.fhir.org
- **US Core Implementation Guide:** http://hl7.org/fhir/us/core/

---

## Support

For EHR-specific integration questions:
- **Epic Support:** https://fhir.epic.com/Support
- **Cerner Support:** https://fhir.cerner.com/support
- **General SMART/FHIR:** https://groups.google.com/g/smart-on-fhir

For app-specific issues, see the main [README.md](../README.md) troubleshooting section.
