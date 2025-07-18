FROM python:3.12-slim
RUN mkdir -p /app/config
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ /app

CMD ["python", "app.py"]
