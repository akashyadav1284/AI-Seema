import asyncio
import httpx

API_URL = 'http://localhost:8000/api'

async def check():
    async with httpx.AsyncClient() as client:
        # login
        resp = await client.post(f'{API_URL}/auth/login', data={'username': 'admin@example.com', 'password': 'admin'})
        token = resp.json()['access_token']

        headers = {'Authorization': f'Bearer {token}'}
        resp = await client.get(f'{API_URL}/evidence/snapshots/EVT-20260918-080732-E4AC966D.jpg', headers=headers)
        print(f'Evidence fetch status: {resp.status_code}')
        print(f'Content Type: {resp.headers.get("content-type")}')
        print(f'Bytes returned: {len(resp.content)}')

asyncio.run(check())
