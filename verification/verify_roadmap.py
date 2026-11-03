import json
from playwright.sync_api import sync_playwright

mock_session = {
    "access_token": "mock-token",
    "user": {
        "id": "e2e-user-123",
        "email": "test@example.com",
        "user_metadata": {"full_name": "Test Student"}
    }
}

mock_leaderboard = {
    "entries": [
        {"id": "1", "name": "Alice", "xp": 1200, "rank": 1},
        {"id": "2", "name": "Bob", "xp": 1000, "rank": 2},
        {"id": "3", "name": "Charlie", "xp": 800, "rank": 3},
        {"id": "4", "name": "David", "xp": 600, "rank": 4},
        {"id": "5", "name": "Eve", "xp": 400, "rank": 5}
    ],
    "me": {"id": "e2e-user-123", "name": "Test Student", "xp": 450, "rank": 5}
}

def setup_supabase_routes(page):
    def handle_supabase(route):
        url = route.request.url
        if "get_leaderboard" in url or "rpc/get_leaderboard" in url:
            route.fulfill(status=200, content_type="application/json", body=json.dumps(mock_leaderboard))
        elif "profiles" in url:
            route.fulfill(status=200, content_type="application/json", body=json.dumps({
                "id": "e2e-user-123",
                "user_id": "e2e-user-123",
                "daily_goal_minutes": 120,
                "xp_points": 450,
                "level": 4,
                "onboarding_completed": True
            }))
        elif "Study" in url or "study_history" in url:
            route.fulfill(status=200, content_type="application/json", body=json.dumps([]))
        elif "session_resources" in url:
            route.fulfill(status=200, headers={"content-range": "0-0/0"}, content_type="application/json", body=json.dumps([]))
        elif "user_achievements" in url or "achievements" in url:
            route.fulfill(status=200, content_type="application/json", body=json.dumps([]))
        elif "/rpc/" in url:
            route.fulfill(status=200, content_type="application/json", body=json.dumps(mock_leaderboard))
        else:
            route.fulfill(status=200, content_type="application/json", body=json.dumps([]))

    page.route("**/*.supabase.co/**", handle_supabase)
    page.route("**/rest/v1/**", handle_supabase)
    page.route("**/rpc/**", handle_supabase)

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # Desktop 1280x900
        context = browser.new_context(
            record_video_dir="/app/verification/videos",
            viewport={"width": 1280, "height": 900}
        )
        context.add_init_script(f"""
            window.__E2E_SESSION__ = {json.dumps(mock_session)};
            window.sessionStorage.setItem('hyper-tutor-onboarding-complete:e2e-user-123', 'true');
        """)
        page = context.new_page()
        setup_supabase_routes(page)

        page.goto("http://localhost:5173/Progress")
        page.wait_for_timeout(2000)

        # Close celebration popup if open
        try:
            awesome_btn = page.get_by_role("button", name="Awesome!")
            if awesome_btn.is_visible():
                awesome_btn.click()
                page.wait_for_timeout(500)
        except Exception as e:
            print("Modal close exception:", e)

        # Take desktop roadmap screenshot
        page.screenshot(path="/app/verification/screenshots/verification.png")
        print("Desktop screenshot captured")

        context.close()

        # Mobile 375x812
        context_mobile = browser.new_context(
            viewport={"width": 375, "height": 812}
        )
        context_mobile.add_init_script(f"""
            window.__E2E_SESSION__ = {json.dumps(mock_session)};
            window.sessionStorage.setItem('hyper-tutor-onboarding-complete:e2e-user-123', 'true');
        """)
        page_mobile = context_mobile.new_page()
        setup_supabase_routes(page_mobile)

        page_mobile.goto("http://localhost:5173/Progress")
        page_mobile.wait_for_timeout(2000)

        try:
            awesome_btn = page_mobile.get_by_role("button", name="Awesome!")
            if awesome_btn.is_visible():
                awesome_btn.click()
                page_mobile.wait_for_timeout(500)
        except Exception as e:
            print("Mobile modal close exception:", e)

        page_mobile.screenshot(path="/app/verification/screenshots/mobile_verification.png")
        print("Mobile screenshot captured")
        context_mobile.close()

        browser.close()

if __name__ == "__main__":
    run()
