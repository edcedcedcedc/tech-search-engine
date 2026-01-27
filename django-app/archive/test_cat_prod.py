# management/commands/ai_categorize.py
import asyncio
import aiohttp
from datetime import timedelta
from django.utils import timezone
from django.core.management.base import BaseCommand
from django.db.models import Q
import concurrent.futures
from products.models import Product


class Command(BaseCommand):
    help = "AI-powered product categorization (async version)"

    # Your categories list
    CATEGORIES = [
        # ... your full categories list
    ]

    async def handle_async(self, *args, **options):
        """Async handler for better performance"""
        # Get products
        products = await self._get_products_to_process(options)

        if not products:
            self.stdout.write("No products to process")
            return

        # Process in batches
        batch_size = 10
        for i in range(0, len(products), batch_size):
            batch = products[i : i + batch_size]
            await self._process_batch(batch, options)

    def handle(self, *args, **options):
        """Synchronous wrapper for async handler"""
        asyncio.run(self.handle_async(*args, **options))

    async def _get_products_to_process(self, options):
        """Get products that need categorization"""
        cutoff = timezone.now() - timedelta(hours=options.get("hours", 24))

        # Using Django's ORM in async context
        from django.db import connection

        query = """
            SELECT id, name, variant, brand, category, shop
            FROM your_app_product
            WHERE created_at >= %s
            AND (t_category IS NULL OR t_category->>'ai_matched' IS NULL)
            ORDER BY created_at DESC
            LIMIT %s
        """

        with connection.cursor() as cursor:
            cursor.execute(query, [cutoff, options.get("limit", 100)])
            columns = [col[0] for col in cursor.description]
            products = [dict(zip(columns, row)) for row in cursor.fetchall()]

        return products

    async def _process_batch(self, batch, options):
        """Process a batch of products"""
        async with aiohttp.ClientSession() as session:
            tasks = []
            for product in batch:
                task = self._categorize_single(session, product, options)
                tasks.append(task)

            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Update database
            await self._update_database(results)

    async def _categorize_single(self, session, product, options):
        """Categorize a single product"""
        # Build OpenAI request
        prompt = self._build_prompt(product)

        payload = {
            "model": options.get("model", "gpt-3.5-turbo"),
            "messages": [
                {
                    "role": "system",
                    "content": "You are a product categorization assistant.",
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.1,
        }

        try:
            async with session.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                json=payload,
            ) as response:
                data = await response.json()
                return self._parse_response(data, product)
        except Exception as e:
            return {"error": str(e), "product_id": product["id"]}
