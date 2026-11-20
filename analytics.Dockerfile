FROM python:3.13-slim
WORKDIR /service
COPY analytics-requirements.txt ./
RUN pip install --no-cache-dir -r analytics-requirements.txt
COPY analytics_app.py analytics_logic.py ./
EXPOSE 8001
CMD ["uvicorn", "analytics_app:app", "--host", "0.0.0.0", "--port", "8001"]
