from datetime import datetime, timedelta
from jose import jwt, JWTError
from app.config import settings

print("SETTINGS SECRET_KEY:", settings.SECRET_KEY)
print("SETTINGS ALGORITHM:", settings.ALGORITHM)

data = {"sub": "representative@crm.com", "user_id": 1, "role": "representative"}
expire = datetime.utcnow() + timedelta(minutes=1440)
data.update({"exp": expire})

try:
    token = jwt.encode(data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    print("Encoded token successfully.")
    
    decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    print("Decoded token successfully:", decoded)
except JWTError as e:
    print("JWT Error:", str(e))
except Exception as e:
    print("General Error:", str(e))
