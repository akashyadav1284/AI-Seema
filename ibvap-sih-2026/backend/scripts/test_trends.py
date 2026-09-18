import requests
import time

url_login = 'http://127.0.0.1:8000/api/auth/login'
data = {'username': 'ai_test@example.com', 'password': 'Password123!'}
res = requests.post(url_login, data=data)
token = res.json().get('access_token')
headers = {'Authorization': f'Bearer {token}'}

print('Testing without params')
r1 = requests.get('http://127.0.0.1:8000/api/analytics/events/trends', headers=headers)
print(r1.status_code, r1.text)

now = time.time()
print('Testing with seconds')
r2 = requests.get(f'http://127.0.0.1:8000/api/analytics/events/trends?start_time={now-86400}&end_time={now}&interval=hour', headers=headers)
print(r2.status_code, r2.text)

print('Testing with ms')
r3 = requests.get(f'http://127.0.0.1:8000/api/analytics/events/trends?start_time={(now-86400)*1000}&end_time={now*1000}&interval=hour', headers=headers)
print(r3.status_code, r3.text)
