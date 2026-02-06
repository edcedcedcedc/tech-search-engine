# Start all services
cd server/docker
docker-compose -f docker-compose-redis.yml up



# Stop all services
docker-compose -f docker-compose-redis.yml down

# Restart specific service
docker-compose -f docker-compose-redis.yml restart django

# View logs
docker-compose -f docker-compose-redis.yml logs -f  # all logs
docker-compose -f docker-compose-redis.yml logs -f celery_worker  # just worker
docker-compose -f docker-compose-redis.yml logs -f django  # just django

# Django shell inside container
docker-compose -f docker-compose-redis.yml exec django python manage.py shell

# Run management commands
docker-compose -f docker-compose-redis.yml exec django python manage.py migrate
docker-compose -f docker-compose-redis.yml exec django python manage.py createsuperuser

# Run your pipeline test
docker-compose -f docker-compose-redis.yml exec django python scripts/run_pipeline_test.py

# Run single task
docker-compose -f docker-compose-redis.yml exec django python -c "
from products.tasks import debug_test_task
result = debug_test_task.delay('Test')
print(f'Task sent: {result.id}')
"

# Check container status
docker-compose -f docker-compose-redis.yml ps

# Rebuild containers (after code changes)
docker-compose -f docker-compose-redis.yml build

# Access Redis CLI
docker-compose -f docker-compose-redis.yml exec redis redis-cli



# Run Celery, Purge Celery
celery -A aggregator worker --loglevel=info --pool=solo
celery -A aggregator purge