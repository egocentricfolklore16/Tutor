import os
import time
from playwright.sync_api import sync_playwright

def run_cuj(page):
    # Add script to mock supabase auth user on window before page loads
    page.add_init_script("""
        window.localStorage.setItem('sb-test-auth-token', JSON.stringify({
            access_token: 'mock-token',
            user: { id: 'test-user', email: 'caleb@example.com', user_metadata: { full_name: 'Caleb' } }
        }));
    """)

    # Mock Supabase API calls
    def handle_route(route, request):
        url = request.url
        if "/auth/v1/" in url:
            route.fulfill(
                status=200,
                content_type="application/json",
                body='{"id":"test-user","email":"caleb@example.com","user_metadata":{"full_name":"Caleb"}}'
            )
        elif "/rest/v1/profiles" in url:
            route.fulfill(
                status=200,
                content_type="application/json",
                body='[{"username":"Caleb","full_name":"Caleb","onboarding_completed":false,"onboarding_step":0}]'
            )
        elif "/rest/v1/onboarding_answers" in url:
            route.fulfill(
                status=200,
                content_type="application/json",
                body='[]'
            )
        else:
            route.continue_()

    page.route("**/*", handle_route)

    page.goto("http://localhost:5173/onboarding")
    page.wait_for_timeout(300)
    page.click("body")
    page.wait_for_timeout(2500)

    # Inject mock user into supabase client if needed
    page.evaluate("""async () => {
        if (window.supabase) {
            window.supabase.auth.getUser = async () => ({
                data: { user: { id: 'test-user', email: 'caleb@example.com', user_metadata: { full_name: 'Caleb' } } },
                error: null
            });
        }
    }""")

    # Take screenshot of Step 1
    page.screenshot(path="/home/jules/verification/screenshots/onboarding_step1.png")
    page.wait_for_timeout(500)

    # Fill name field
    name_input = page.get_by_placeholder("Your preferred name")
    if name_input.is_visible():
        name_input.fill("Caleb")
        page.wait_for_timeout(500)

        # Click Continue on Step 1
        continue_btn = page.get_by_role("button", name="Continue", exact=True)
        if continue_btn.is_visible():
            continue_btn.click()
            page.wait_for_timeout(1000)

    # Screenshot Step 2 (Subjects)
    page.screenshot(path="/home/jules/verification/screenshots/verification.png")
    page.wait_for_timeout(1000)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
