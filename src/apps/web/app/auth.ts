const issuer = process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER || 'http://localhost:8080/realms/legal-metrology';
const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'metrology-web';
function base64Url(bytes: Uint8Array){let binary='';for(let i=0;i<bytes.length;i+=1)binary+=String.fromCharCode(bytes[i]);return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
export async function beginKeycloakLogin(){ const verifier=base64Url(crypto.getRandomValues(new Uint8Array(32))); const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)); sessionStorage.setItem('pkce_verifier',verifier); window.location.href = `${issuer}/protocol/openid-connect/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(window.location.origin + '/login')}&response_type=code&scope=openid%20profile%20email&code_challenge_method=S256&code_challenge=${base64Url(new Uint8Array(digest))}`; }
export async function completeKeycloakLogin(code:string){const verifier=sessionStorage.getItem('pkce_verifier'); if(!verifier)return false; const body=new URLSearchParams({grant_type:'authorization_code',client_id:clientId,code,redirect_uri:window.location.origin+'/login',code_verifier:verifier}); const response=await fetch(`${issuer}/protocol/openid-connect/token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body}); if(!response.ok)return false; const tokens=await response.json(); sessionStorage.setItem('metrology_access_token',tokens.access_token); sessionStorage.setItem('demo_session','1'); if(tokens.refresh_token)sessionStorage.setItem('metrology_refresh_token',tokens.refresh_token); if(tokens.id_token)sessionStorage.setItem('metrology_id_token',tokens.id_token); sessionStorage.removeItem('pkce_verifier'); return true;}
export function logout(){
  const hasKeycloakSession=Boolean(sessionStorage.getItem('metrology_access_token')||sessionStorage.getItem('metrology_refresh_token')||sessionStorage.getItem('metrology_id_token'));
  const idToken=sessionStorage.getItem('metrology_id_token');
  ['metrology_access_token','metrology_refresh_token','metrology_id_token','demo_session','pkce_verifier'].forEach((key)=>sessionStorage.removeItem(key));
  const loginUrl=`${window.location.origin}/login?logged_out=1`;
  if(!hasKeycloakSession){ window.location.replace(loginUrl); return; }
  const params=new URLSearchParams({client_id:clientId,post_logout_redirect_uri:loginUrl});
  if(idToken)params.set('id_token_hint',idToken);
  window.location.replace(`${issuer}/protocol/openid-connect/logout?${params.toString()}`);
}
export function getToken(){ return typeof window === 'undefined' ? null : sessionStorage.getItem('metrology_access_token'); }
