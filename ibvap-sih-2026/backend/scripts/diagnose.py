import requests

url_login = 'http://127.0.0.1:8000/api/auth/login'
data = {'username': 'ai_test@example.com', 'password': 'Password123!'}
res = requests.post(url_login, data=data)
token = res.json().get('access_token')
print('Token:', bool(token))

headers = {'Authorization': f'Bearer {token}'}

print('--- /api/cameras ---')
res_cam = requests.get('http://127.0.0.1:8000/api/cameras', headers=headers)
print('Status:', res_cam.status_code)
print('Response:', res_cam.text)

print('--- /api/cameras/ ---')
res_cam2 = requests.get('http://127.0.0.1:8000/api/cameras/', headers=headers)
print('Status:', res_cam2.status_code)
print('Response:', res_cam2.text)

print('--- /api/alerts (find one to ack) ---')
res_alerts = requests.get('http://127.0.0.1:8000/api/alerts', headers=headers)
alerts = res_alerts.json()
if alerts:
    alert_id = alerts[0].get('id') or alerts[0].get('_id')
    print('Trying ack on:', alert_id)
    res_ack = requests.post(f'http://127.0.0.1:8000/api/alerts/{alert_id}/ack', headers=headers)
    print('Ack Status:', res_ack.status_code)
    print('Ack Response:', res_ack.text)

print('--- /api/analytics ---')
res_an = requests.get('http://127.0.0.1:8000/api/analytics', headers=headers)
print('Status:', res_an.status_code)
print('Response:', res_an.text)

print('--- /api/evidence ---')
res_ev = requests.get('http://127.0.0.1:8000/api/evidence', headers=headers)
print('Status:', res_ev.status_code)
print('Response:', res_ev.text)

