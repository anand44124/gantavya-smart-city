import urllib.request
import urllib.error
import json
import time

BASE_URL = "http://127.0.0.1:8000"
results = []

def make_req(path, method="GET", data=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, {"detail": err_body}
    except Exception as e:
        return 0, {"error": str(e)}

def test(name, condition, details=""):
    status = "✅ PASS" if condition else "❌ FAIL"
    results.append((name, status, details))
    print(f"{status} | {name} {f'({details})' if details else ''}")

print("\n" + "="*60)
print("🚀 GANTAVYA FULL-SYSTEM A-TO-Z VERIFICATION SUITE")
print("="*60 + "\n")

# 1. Health check
st, res = make_req("/health")
test("API Health Check", st == 200 and res.get("status") in ("ok", "healthy"), f"Status: {res.get('status')}")

# 2. Demo Citizen Login & 50,000 Points Check
st, res = make_req("/api/auth/demo-login", "POST", {"role": "citizen"})
citizen_token = res.get("access_token")
user = res.get("user", {})
test("Demo Citizen Login", st == 200 and citizen_token is not None, f"User: {user.get('email')}")
test("Demo Citizen 50,000 Points", user.get("points") == 50000 and user.get("badge_level") == "Diamond Reformer", f"Points: {user.get('points')} PTS | Badge: {user.get('badge_level')}")

# 3. Demo Admin Login
st, res = make_req("/api/auth/demo-login", "POST", {"role": "admin"})
admin_token = res.get("access_token")
user_admin = res.get("user", {})
test("Demo Admin Login", st == 200 and user_admin.get("role") == "admin", f"Role: {user_admin.get('role')} | Points: {user_admin.get('points')}")

# 4. Demo Worker Login
st, res = make_req("/api/auth/demo-login", "POST", {"role": "worker"})
worker_token = res.get("access_token")
user_worker = res.get("user", {})
test("Demo Worker Login", st == 200 and user_worker.get("role") == "worker", f"Role: {user_worker.get('role')} | Points: {user_worker.get('points')}")

# 5. New User Registration & 0 Points Start
test_email = f"test_citizen_{int(time.time())}@example.com"
st, res = make_req("/api/auth/register", "POST", {
    "full_name": "Test Citizen User",
    "email": test_email,
    "password": "Password@123"
})
reg_token = res.get("access_token")
new_user = res.get("user", {})
test("New Citizen Registration", st == 201 and reg_token is not None, f"Email: {test_email}")
test("New Citizen Starts with 0 Points", new_user.get("points") == 0 and new_user.get("badge_level") == "Bronze Scout", f"Points: {new_user.get('points')} PTS")

# 6. Registered User Login
st, res = make_req("/api/auth/login", "POST", {
    "email": test_email,
    "password": "Password@123"
})
login_user = res.get("user", {})
test("Registered User Login", st == 200 and login_user.get("email") == test_email, f"Logged in: {login_user.get('email')}")

# 7. Invalid Login Error Handling
st, res = make_req("/api/auth/login", "POST", {
    "email": "non_existent_987654@gmail.com",
    "password": "WrongPassword@123"
})
test("Clean Error for Unregistered Email", st == 401 and "No account found" in str(res.get("detail", "")), f"Error: {res.get('detail')}")

# 8. Forgot Password OTP Generation
st, res = make_req("/api/auth/forgot-password", "POST", {"email": test_email})
otp = res.get("otp_preview")
test("Forgot Password OTP Dispatch", st == 200 and otp is not None and len(otp) == 6, f"Generated OTP: {otp}")

# 9. Password Reset with OTP
new_pass = "UpdatedSecure@987"
st, res = make_req("/api/auth/reset-password", "POST", {
    "email": test_email,
    "otp": otp,
    "new_password": new_pass
})
test("Reset Password with OTP", st == 200, f"Response: {res.get('message')}")

# 10. Login with New Password
st, res = make_req("/api/auth/login", "POST", {
    "email": test_email,
    "password": new_pass
})
test("Login with Newly Reset Password", st == 200, f"Token generated: {bool(res.get('access_token'))}")

# 11. Reports List API
st, res = make_req("/api/reports", token=citizen_token)
test("Citizen Reports List API", st == 200 and isinstance(res, list), f"Reports count: {len(res)}")

# 12. Rewards Catalog API
st, res = make_req("/api/rewards/catalog", token=citizen_token)
catalog = res.get("catalog", [])
test("Rewards Catalog API", st == 200 and len(catalog) > 0, f"Catalog items: {len(catalog)}")

# 13. Transit Pass Redemption (Demo Citizen 50,000 Points)
st, res = make_req("/api/rewards/redeem", "POST", {"reward_id": "metro_day_pass", "transit_mode": "metro"}, token=citizen_token)
test("Metro Transit Pass Redemption", st == 200 and "pass_code" in res, f"Pass Code: {res.get('pass_code')} | Title: {res.get('title')}")

# 14. Rewards History & Active Passes API
st, res = make_req("/api/rewards/my-history", token=citizen_token)
test("Rewards History & Balance API", st == 200 and "points" in res, f"Current Balance: {res.get('points')} PTS | Active Passes: {res.get('active_passes_count')}")

# 15. User My Passes API
st, res = make_req("/api/rewards/my-passes", token=citizen_token)
test("Redeemed Passes Active List", st == 200 and isinstance(res, list), f"Passes in wallet: {len(res)}")

# 16. Leaderboard API
st, res = make_req("/api/rewards/leaderboard", token=citizen_token)
leaderboard = res if isinstance(res, list) else res.get("leaderboard", [])
test("Civic Leaderboard API", st == 200 and len(leaderboard) > 0, f"Ranked Citizens: {len(leaderboard)}")

# 17. User Profile /me API
st, res = make_req("/api/auth/me", token=citizen_token)
test("Current User Profile (/me)", st == 200 and res.get("email") == "citizen1@civicpulse.demo", f"Profile Name: {res.get('full_name')}")

print("\n" + "="*60)
passed = sum(1 for _, st, _ in results if "PASS" in st)
total = len(results)
print(f"📊 SUMMARY: {passed}/{total} TESTS PASSED ({int(passed/total*100)}% HEALTHY)")
print("="*60 + "\n")
