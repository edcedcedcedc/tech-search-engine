# products/ai/comparison.py
import json
import logging
import re
from typing import List, Dict, Any, Optional
from django.conf import settings
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.core.cache import cache
import hashlib
from datetime import datetime, timedelta
import math
from rapidfuzz import fuzz
from products.utils.log.search_engine_log import search_engine_log
import numpy as np
from products.search.utils import ascii_folding, cosine_similarity
from openai import OpenAI
import environ

logger = logging.getLogger(__name__)

# Configure OpenAI client exactly as in your working example
env = environ.Env()
environ.Env.read_env()
client = OpenAI(api_key=env("OPENAI_API_KEY"))


# Language-specific system prompts with simulated web knowledge
SYSTEM_PROMPTS = {
    "en": """You are a sophisticated shopping assistant that specializes in trend-aware product comparison.
    
    IMPORTANT: You have comprehensive knowledge of products including expert reviews, common issues, and market reputation from sources like TechRadar, CNET, Tom's Hardware, and user forums.
    
    For each product you analyze:
    1. Use the provided price/trend data as your baseline
    2. Draw upon your knowledge of:
       - Professional reviews and ratings
       - Common issues or known problems
       - User sentiment and real-world performance
       - Additional specifications not listed in the variant
       - Release date and product lifecycle
       - Award wins or certifications
       - Warranty and customer support reputation
    
    3. Synthesize this knowledge with the trend data to provide:
       - Whether the product is actually good (not just based on price)
       - If there are known alternatives you should consider
       - If the price trend reflects a product that's being discontinued or refreshed
       - Honest assessment of value based on market reputation
    
    You compare specs side-by-side and consider variant differences.
    You always respond in JSON format with detailed analysis.
    Pay special attention to the user's specific question or request if provided.""",
    "ro": """Ești un asistent de cumpărături sofisticat specializat în compararea produselor cu analiză de trend.
    
    IMPORTANT: Ai cunoștințe cuprinzătoare despre produse, inclusiv recenzii ale experților, probleme comune și reputația pieței din surse precum TechRadar, CNET, Tom's Hardware și forumuri de utilizatori.
    
    Pentru fiecare produs pe care îl analizezi:
    1. Folosește datele furnizate despre preț/tendințe ca bază
    2. Folosește cunoștințele tale despre:
       - Recenzii profesionale și evaluări
       - Probleme comune sau cunoscute
       - Sentimentul utilizatorilor și performanța reală
       - Specificații suplimentare care nu sunt listate în variantă
       - Data lansării și ciclul de viață al produsului
       - Premii câștigate sau certificări
       - Garanție și reputația suportului clienți
    
    3. Sintetizează aceste cunoștințe cu datele de trend pentru a oferi:
       - Dacă produsul este cu adevărat bun (nu doar bazat pe preț)
       - Dacă există alternative cunoscute pe care ar trebui să le iei în considerare
       - Dacă tendința prețului reflectă un produs care este întrerupt sau reîmprospătat
       - Evaluare onestă a valorii bazată pe reputația pieței
    
    Compari specificațiile una lângă alta și iei în considerare diferențele de variantă.
    Răspunzi întotdeauna în format JSON cu analiză detaliată.
    Acordă atenție specială întrebării sau cererii specifice a utilizatorului dacă este furnizată.""",
    "ru": """Вы sophisticated shopping assistant, специализирующийся на сравнении товаров с учетом трендов.
    
    ВАЖНО: У вас есть всесторонние знания о продуктах, включая экспертные обзоры, распространенные проблемы и рыночную репутацию из таких источников, как TechRadar, CNET, Tom's Hardware и пользовательские форумы.
    
    Для каждого анализируемого продукта:
    1. Используйте предоставленные данные о цене/трендах как основу
    2. Используйте свои знания о:
       - Профессиональные обзоры и рейтинги
       - Распространенные проблемы или известные недостатки
       - Мнения пользователей и реальную производительность
       - Дополнительные характеристики, не указанные в варианте
       - Дату выпуска и жизненный цикл продукта
       - Награды или сертификаты
       - Гарантию и репутацию службы поддержки
    
    3. Синтезируйте эти знания с данными о трендах, чтобы предоставить:
       - Действительно ли продукт хорош (не только на основе цены)
       - Существуют ли известные альтернативы, которые стоит рассмотреть
       - Отражает ли тренд цены продукт, который снимают с производства или обновляют
       - Честную оценку ценности на основе рыночной репутации
    
    Вы сравниваете характеристики бок о бок и учитываете различия в вариантах.
    Вы всегда отвечаете в формате JSON с детальным анализом.
    Уделите особое внимание конкретному вопросу или запросу пользователя, если он предоставлен.""",
}


class ProductComparisonView(View):
    """
    API endpoint for AI-powered product comparison with market knowledge.
    Accepts a list of offers and returns a trend-aware comparison analysis.
    Supports language selection (en/ro/ru) and user-specific queries.
    """

    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def post(self, request):
        try:
            # Parse request body
            data = json.loads(request.body)
            offers = data.get("offers", [])
            user_tier = data.get("tier", "free")  # 'free' or 'premium'
            language = data.get("lang", "en")  # 'en', 'ro', 'ru'
            user_text = data.get("user_text", "")  # User's specific question/request

            # Validate language
            if language not in ["en", "ro", "ru"]:
                language = "en"

            # Validate input
            if not offers:
                return JsonResponse({"error": "No offers provided"}, status=400)

            if len(offers) > 10:  # Limit to 10 offers max
                return JsonResponse({"error": "Too many offers (max 10)"}, status=400)

            # For free tier, limit to 2 offers
            if user_tier == "free" and len(offers) > 2:
                offers = offers[:2]

            # Generate cache key based on offers, tier, language, and user_text
            cache_key = self._generate_cache_key(offers, user_tier, language, user_text)

            # Check cache first
            cached_result = cache.get(cache_key)
            if cached_result:
                logger.info(f"Cache hit for comparison {cache_key}")
                return JsonResponse(
                    {"success": True, "cached": True, "analysis": cached_result}
                )

            # Prepare data for AI with enhanced trend analysis
            analysis = self._analyze_with_ai(offers, user_tier, language, user_text)

            # Cache for 1 hour
            cache.set(cache_key, analysis, 3600)

            return JsonResponse(
                {"success": True, "cached": False, "analysis": analysis}
            )

        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)
        except Exception as e:
            logger.error(f"Comparison error: {str(e)}", exc_info=True)
            return JsonResponse({"error": "Internal server error"}, status=500)

    def _generate_cache_key(
        self, offers: List[Dict], tier: str, language: str, user_text: str
    ) -> str:
        """Generate a unique cache key for this comparison"""
        # Sort offers by ID for consistency
        sorted_offers = sorted(offers, key=lambda x: x.get("id", ""))

        # Create a string with relevant data including trend hash
        key_data = json.dumps(
            [
                {
                    "id": o.get("id"),
                    "price": o.get("price"),
                    "in_stock": o.get("in_stock"),
                    "trend_preview": o.get("price_trend_preview", {}),
                }
                for o in sorted_offers
            ]
        )

        # Add tier, language and user_text hash
        user_text_hash = (
            hashlib.md5(user_text.encode()).hexdigest()[:8] if user_text else "notext"
        )
        cache_string = f"{key_data}_{tier}_{language}_{user_text_hash}"
        return f"comparison_{hashlib.md5(cache_string.encode()).hexdigest()}"

    def _extract_trend_insights(self, trend_data: List[Dict]) -> Dict:
        """Extract meaningful insights from price trend data"""
        if not trend_data or len(trend_data) < 2:
            return {
                "direction": "unknown",
                "volatility": 0,
                "momentum": 0,
                "best_time_to_buy": "unknown",
                "price_change_percent": 0,
                "avg_price": 0,
            }

        prices = [p.get("price", 0) for p in trend_data]
        dates = [p.get("recorded_at") for p in trend_data]

        first_price = prices[0]
        last_price = prices[-1]
        price_change = last_price - first_price
        price_change_percent = (
            (price_change / first_price * 100) if first_price > 0 else 0
        )

        # Calculate volatility (standard deviation of price changes)
        price_diffs = [abs(prices[i] - prices[i - 1]) for i in range(1, len(prices))]
        avg_diff = sum(price_diffs) / len(price_diffs) if price_diffs else 0
        volatility = avg_diff / first_price if first_price > 0 else 0

        # Calculate momentum (rate of change in last 3 points vs previous)
        if len(prices) >= 4:
            recent_trend = prices[-3:]
            older_trend = prices[:3]
            recent_avg = sum(recent_trend) / len(recent_trend)
            older_avg = sum(older_trend) / len(older_trend)
            momentum = (recent_avg - older_avg) / older_avg if older_avg > 0 else 0
        else:
            momentum = price_change_percent / 100

        # Determine best time to buy based on trend
        if len(prices) >= 3:
            if prices[-1] < prices[-2] < prices[-3]:
                best_time = "now (price dropping)"
            elif prices[-1] > prices[-2] > prices[-3]:
                best_time = "wait (price rising)"
            elif prices[-1] < prices[-2] and prices[-2] > prices[-3]:
                best_time = "consider (price peaked)"
            else:
                best_time = "monitor (unclear trend)"
        else:
            best_time = "insufficient data"

        return {
            "direction": (
                "down"
                if last_price < first_price
                else "up" if last_price > first_price else "stable"
            ),
            "volatility": round(volatility * 100, 2),  # as percentage
            "momentum": round(momentum * 100, 2),  # as percentage
            "best_time_to_buy": best_time,
            "price_change_percent": round(price_change_percent, 2),
            "avg_price": round(sum(prices) / len(prices), 2),
            "first_price": first_price,
            "last_price": last_price,
            "data_points": len(trend_data),
            "trend_length_days": self._calculate_trend_days(dates) if dates else 0,
        }

    def _calculate_trend_days(self, dates: List[str]) -> int:
        """Calculate number of days in trend"""
        if not dates or len(dates) < 2:
            return 0
        try:
            first_date = datetime.fromisoformat(dates[0].replace("Z", "+00:00"))
            last_date = datetime.fromisoformat(dates[-1].replace("Z", "+00:00"))
            return (last_date - first_date).days
        except:
            return 0

    def _prepare_offers_for_ai(
        self, offers: List[Dict], tier: str, language: str
    ) -> List[Dict]:
        """Prepare offers for AI analysis with enhanced trend data"""
        prepared = []

        for offer in offers:
            # Base offer data - use translated fields based on language
            t_name = offer.get("t_name", {})
            t_variant = offer.get("t_variant", {})

            # Get translated name and variant if available
            name = t_name.get(language, offer.get("name", ""))
            variant = t_variant.get(language, offer.get("variant", ""))

            prepared_offer = {
                "id": offer.get("id"),
                "name": name,
                "variant": variant,
                "shop": offer.get("shop"),
                "price": offer.get("price"),
                "in_stock": offer.get("in_stock"),
                "brand": offer.get("brand"),
            }

            # Extract and analyze price trends
            trend_preview = offer.get("price_trend_preview", {})
            free_trend = trend_preview.get("free_price_trend", [])

            # Get trend insights
            trend_insights = self._extract_trend_insights(free_trend)

            if tier == "premium":
                # Premium users get full trend data + insights
                prepared_offer["price_trend"] = free_trend
                prepared_offer["trend_insights"] = trend_insights

                # Calculate if this is a good deal based on trend
                if (
                    trend_insights["direction"] == "down"
                    and trend_insights["momentum"] < -5
                ):
                    prepared_offer["deal_quality"] = (
                        "excellent (accelerating price drop)"
                    )
                elif trend_insights["direction"] == "down":
                    prepared_offer["deal_quality"] = "good (price decreasing)"
                elif (
                    trend_insights["direction"] == "up"
                    and trend_insights["momentum"] > 5
                ):
                    prepared_offer["deal_quality"] = "poor (rapidly increasing)"
                elif trend_insights["direction"] == "up":
                    prepared_offer["deal_quality"] = "fair (price increasing slowly)"
                else:
                    prepared_offer["deal_quality"] = "stable"
            else:
                # Free users get simplified trend data
                if len(free_trend) >= 2:
                    prepared_offer["price_trend"] = {
                        "first": free_trend[0],
                        "last": free_trend[-1],
                        "insights": {
                            "direction": trend_insights["direction"],
                            "change_percent": trend_insights["price_change_percent"],
                            "best_time": trend_insights["best_time_to_buy"],
                        },
                    }
                elif free_trend:
                    prepared_offer["price_trend"] = free_trend
                else:
                    prepared_offer["price_trend"] = []

            prepared.append(prepared_offer)

        return prepared

    def _parse_trend_string(self, trend_string: str, language: str) -> Dict:
        """Parse a trend string into a structured object"""
        # Default structure
        result = {
            "trend": "unknown",
            "change": 0,
            "change_percent": 0,
            "volatility": 0,
            "momentum": 0,
            "best_time": "unknown",
            "in_stock": True,
            "risk": "unknown",
            "recommendation": trend_string,  # Keep original as fallback
        }

        # Extract trend direction
        if "stabil" in trend_string.lower() or "stable" in trend_string.lower():
            result["trend"] = "stable"
        elif (
            "scădere" in trend_string.lower()
            or "down" in trend_string.lower()
            or "descre" in trend_string.lower()
        ):
            result["trend"] = "down"
        elif (
            "creștere" in trend_string.lower()
            or "up" in trend_string.lower()
            or "cresc" in trend_string.lower()
        ):
            result["trend"] = "up"

        # Extract price change percentage
        percent_match = re.search(r"([-+]?\d*\.?\d+)%", trend_string)
        if percent_match:
            result["change_percent"] = float(percent_match.group(1))
            result["change"] = result[
                "change_percent"
            ]  # Keep for backward compatibility

        # Extract risk
        if "risc" in trend_string.lower() or "risk" in trend_string.lower():
            if "fără risc" in trend_string.lower() or "no risk" in trend_string.lower():
                result["risk"] = "low"
            elif (
                "risc semnificativ" in trend_string.lower()
                or "significant risk" in trend_string.lower()
            ):
                result["risk"] = "high"
            else:
                result["risk"] = "medium"

        # Extract best time
        if "recomandare" in trend_string.lower() or "recommend" in trend_string.lower():
            sentences = trend_string.split(".")
            for sentence in sentences:
                if "recomand" in sentence.lower() or "recomandare" in sentence.lower():
                    result["recommendation"] = sentence.strip()

        return result

    def _infer_risk_from_trend(self, trend_data: Dict) -> str:
        """Infer risk level from trend data"""
        direction = trend_data.get("direction", "unknown")
        momentum = trend_data.get("momentum", 0)
        volatility = trend_data.get("volatility", 0)

        if direction == "up" and momentum > 5:
            return "high (prices rising rapidly)"
        elif direction == "down" and momentum < -5:
            return "low (prices dropping - good for buying)"
        elif volatility > 10:
            return "medium (unstable price)"
        elif direction == "stable":
            return "low (stable price)"
        else:
            return "unknown"

    def _analyze_with_ai(
        self, offers: List[Dict], tier: str, language: str, user_text: str
    ) -> Dict:
        """Send offers to AI and get trend-aware analysis with market knowledge"""

        prepared_offers = self._prepare_offers_for_ai(offers, tier, language)

        # Build enhanced prompt with trend awareness and user text
        if len(offers) == 1:
            prompt = self._build_single_offer_prompt(
                prepared_offers[0], tier, language, user_text
            )
        else:
            prompt = self._build_comparison_prompt(
                prepared_offers, tier, language, user_text
            )

        # Get language-specific system prompt
        system_prompt = SYSTEM_PROMPTS.get(language, SYSTEM_PROMPTS["en"])

        try:
            # Call OpenAI API (no web search tools)
            response = client.chat.completions.create(
                model="gpt-5-nano-2025-08-07",
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt,
                    },
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
            )

            # Parse AI response
            ai_response = json.loads(response.choices[0].message.content)

            # Format the response with structured trend analysis
            formatted_response = {
                "summary": ai_response.get("summary", ""),
                "recommendation": ai_response.get("recommendation", ""),
                "trend_analysis": {},
                "spec_comparison": ai_response.get("spec_comparison", []),
                "expert_insights": ai_response.get("expert_insights", {}),
                "expert_consensus": ai_response.get("expert_consensus", ""),
                "known_issues": ai_response.get("known_issues", []),
                "alternatives_suggested": ai_response.get("alternatives_suggested", []),
                "best_choice": ai_response.get("best_choice"),
                "analysis_tier": tier,
                "language": language,
                "user_text_used": bool(user_text),
                "analyzed_at": datetime.now().isoformat(),
            }

            # Process trend_analysis to ensure structured format with English keys
            raw_trend_analysis = ai_response.get("trend_analysis", {})

            if isinstance(raw_trend_analysis, dict):
                for product_key, trend_data in raw_trend_analysis.items():
                    if isinstance(trend_data, str):
                        # Parse string into structured object
                        formatted_response["trend_analysis"][product_key] = (
                            self._parse_trend_string(trend_data, language)
                        )
                    elif isinstance(trend_data, dict):
                        # Already an object, ensure keys are English
                        formatted_response["trend_analysis"][product_key] = {
                            "trend": trend_data.get("trend")
                            or trend_data.get("direction")
                            or "unknown",
                            "change": trend_data.get("change")
                            or trend_data.get("price_change")
                            or 0,
                            "change_percent": trend_data.get("change_percent")
                            or trend_data.get("price_change_percent")
                            or 0,
                            "volatility": trend_data.get("volatility", 0),
                            "momentum": trend_data.get("momentum", 0),
                            "best_time": trend_data.get("best_time")
                            or trend_data.get("best_time_to_buy")
                            or "unknown",
                            "in_stock": trend_data.get("in_stock", True),
                            "risk": trend_data.get("risk")
                            or self._infer_risk_from_trend(trend_data),
                            "recommendation": trend_data.get("recommendation") or "",
                            "expert_rating": trend_data.get("expert_rating"),
                            "review_summary": trend_data.get("review_summary"),
                        }
                    else:
                        formatted_response["trend_analysis"][product_key] = {
                            "trend": "unknown",
                            "change": 0,
                            "change_percent": 0,
                            "volatility": 0,
                            "momentum": 0,
                            "best_time": "unknown",
                            "in_stock": True,
                            "risk": "unknown",
                            "recommendation": "",
                        }
            else:
                formatted_response["trend_analysis"] = {}

            return formatted_response

        except Exception as e:
            logger.error(f"AI analysis failed: {str(e)}", exc_info=True)
            # Fallback response if AI fails
            return self._get_fallback_analysis(offers, tier, language)

    def _build_single_offer_prompt(
        self, offer: Dict, tier: str, language: str, user_text: str
    ) -> str:
        """Build enhanced prompt for single product analysis with market knowledge"""

        trend_info = offer.get("price_trend", {})
        trend_insights = (
            offer.get("trend_insights", {})
            if tier == "premium"
            else trend_info.get("insights", {})
        )

        # Add user text section if provided
        user_text_section = ""
        if user_text:
            user_text_section = f"""
        USER'S SPECIFIC QUESTION:
        "{user_text}"
        
        Please address this specific question in your analysis and recommendation.
        """

        prompt = f"""
        Analyze this product and advise if the user should buy it. Use your knowledge of expert reviews, market reputation, and common issues.

        {user_text_section}

        PRODUCT DATA:
        - Name: {offer.get('name')}
        - Brand: {offer.get('brand')}
        - Variant: {offer.get('variant', 'N/A')}
        - Shop: {offer.get('shop')}
        - Current Price: {offer.get('price')} MDL
        - In Stock: {'Yes' if offer.get('in_stock') else 'No'}

        PRICE TREND ANALYSIS:
        """

        if tier == "premium":
            prompt += f"""
        - Trend Direction: {trend_insights.get('direction', 'unknown')}
        - Price Change: {trend_insights.get('price_change_percent', 0)}%
        - Volatility: {trend_insights.get('volatility', 0)}%
        - Momentum: {trend_insights.get('momentum', 0)}%
        - Best Time to Buy: {trend_insights.get('best_time_to_buy', 'unknown')}
        - Data Points: {trend_insights.get('data_points', 0)} over {trend_insights.get('trend_length_days', 0)} days
        - Average Price: {trend_insights.get('avg_price', 0)} MDL
        - Deal Quality: {offer.get('deal_quality', 'unknown')}
        """
        else:
            trend_info_dict = trend_info if isinstance(trend_info, dict) else {}
            insights = trend_info_dict.get("insights", {})
            prompt += f"""
        - Trend Direction: {insights.get('direction', 'unknown')}
        - Price Change: {insights.get('change_percent', 0)}%
        - Best Time: {insights.get('best_time', 'unknown')}
        """

        prompt += """
        NOW, INCORPORATE YOUR KNOWLEDGE OF:
        - Expert reviews and ratings from trusted sources
        - Common issues or problems reported by users
        - How this product compares to competitors
        - Release date and whether a newer version is coming
        - Awards or recognition it has received
        - Real-world performance insights

        Provide a JSON response with:
        1. summary: Brief analysis of the product including market reputation
        2. recommendation: Clear yes/no/maybe with reasoning including trend implications AND expert opinions
        3. trend_analysis: Object containing trend interpretation and future outlook
        4. expert_insights: Object with key findings about the product (ratings, pros/cons, expert consensus)
        5. expert_consensus: Summary of what experts say
        6. known_issues: Array of common problems mentioned in reviews
        7. best_choice: The product ID (same as input)

        Example format:
        {
            "summary": "The iPhone 16 Pro at iStyle has dropped 8% in the last 2 weeks with accelerating momentum. It's widely praised by experts for its camera system and performance, though battery life gets mixed reviews.",
            "recommendation": "YES - Price trend shows strong downward momentum and experts rate this as the best iPhone yet (9/10 average). However, a new model is rumored for September.",
            "trend_analysis": {
                "interpretation": "Price has been consistently dropping with increasing velocity",
                "future_outlook": "Likely to continue dropping in short term, but stabilizing soon",
                "buying_window": "Next 3-5 days optimal"
            },
            "expert_insights": {
                "pros": ["Best-in-class camera", "Fastest processor", "Gorgeous display"],
                "cons": ["Battery life could be better", "Expensive", "No charger included"],
                "average_rating": "9.2/10",
                "review_count": 25
            },
            "expert_consensus": "Universally praised for camera system, performance, and display",
            "known_issues": ["Battery drain on 5G", "Some units have heating issues"],
            "best_choice": "product_123"
        }

        Return ONLY valid JSON. Be specific and detailed in your analysis.
        """

        return prompt

    def _build_comparison_prompt(
        self, offers: List[Dict], tier: str, language: str, user_text: str
    ) -> str:
        """Build enhanced prompt for comparing multiple products with market knowledge"""

        products_text = []
        for i, offer in enumerate(offers, 1):
            trend_info = offer.get("price_trend", {})
            trend_insights = (
                offer.get("trend_insights", {})
                if tier == "premium"
                else trend_info.get("insights", {})
            )

            product_section = f"""
            PRODUCT {i} (ID: {offer.get('id')}):
            - Name: {offer.get('name')}
            - Brand: {offer.get('brand')}
            - Variant: {offer.get('variant', 'N/A')}
            - Shop: {offer.get('shop')}
            - Current Price: {offer.get('price')} MDL
            - In Stock: {'Yes' if offer.get('in_stock') else 'No'}
            
            PRICE TREND ANALYSIS:
            """

            if tier == "premium":
                product_section += f"""
            - Trend Direction: {trend_insights.get('direction', 'unknown')}
            - Price Change: {trend_insights.get('price_change_percent', 0)}%
            - Volatility: {trend_insights.get('volatility', 0)}%
            - Momentum: {trend_insights.get('momentum', 0)}%
            - Best Time to Buy: {trend_insights.get('best_time_to_buy', 'unknown')}
            - Deal Quality: {offer.get('deal_quality', 'unknown')}
            """
            else:
                product_section += f"""
            - Trend Direction: {trend_insights.get('direction', 'unknown')}
            - Price Change: {trend_insights.get('change_percent', 0)}%
            - Best Time: {trend_insights.get('best_time', 'unknown')}
            """

            products_text.append(product_section)

        # Add user text section if provided
        user_text_section = ""
        if user_text:
            user_text_section = f"""
        USER'S SPECIFIC QUESTION/REQUEST:
        "{user_text}"
        
        Please address this specific request in your analysis and final recommendation.
        """

        prompt = f"""
        Compare these {len(offers)} products and recommend the best one to buy. Use your knowledge of expert reviews, market reputation, and common issues.

        {user_text_section}

        {' '.join(products_text)}

        FOR EACH PRODUCT, CONSIDER:
        1. Expert reviews and ratings from trusted sources
        2. Common issues or problems reported by users
        3. Real-world performance comparisons
        4. Release dates and product lifecycles
        5. Awards or recognition

        Analyze:
        1. Price Trend Comparison: Which product has the best price momentum?
        2. Expert Consensus: What do reviewers say about each?
        3. Value Analysis: Which offers best value considering trend, specs, AND expert opinions?
        4. Variant Differences: How do variants affect the comparison?
        5. Known Issues: Are there any red flags?
        6. Timing: Is now the right time to buy each based on trends AND upcoming releases?
        7. User Context: Address the user's specific question/request if provided.

        Provide a JSON response with:
        1. summary: Overall comparison summary including market reputation
        2. recommendation: Which product is best and why (include trend reasoning AND expert opinions)
        3. trend_analysis: Object with per-product trend interpretation and comparison
        4. spec_comparison: Array of objects comparing key specs side-by-side
        5. expert_insights: Object with expert findings for each product
        6. expert_consensus: Summary of what experts say overall
        7. known_issues: Array of common issues across products
        8. alternatives_suggested: Any alternative products worth considering
        9. best_choice: The ID of the recommended product

        Example format:
        {{
            "summary": "Product A is dropping 15% while Product B is stable. Expert reviews favor Product A's performance but note reliability concerns with Product B.",
            "recommendation": "Product A - Strong downward trend and 9/10 expert rating make it the best choice despite slightly higher price",
            "trend_analysis": {{
                "product_123": {{
                    "trend": "down",
                    "change": -15,
                    "volatility": 5,
                    "momentum": -8,
                    "best_time": "now",
                    "risk": "low",
                    "recommendation": "Strong downward momentum, optimal buying window next 3 days"
                }},
                "product_456": {{
                    "trend": "stable",
                    "change": 0,
                    "volatility": 2,
                    "momentum": 0,
                    "best_time": "monitor",
                    "risk": "low",
                    "recommendation": "Stable price, safe choice but no discount opportunity"
                }}
            }},
            "spec_comparison": [
                {{
                    "spec": "Variant",
                    "product_123": "256GB",
                    "product_456": "128GB",
                    "advantage": "product_123"
                }},
                {{
                    "spec": "Expert Rating",
                    "product_123": "9.2/10",
                    "product_456": "8.7/10",
                    "advantage": "product_123"
                }}
            ],
            "expert_insights": {{
                "product_123": {{
                    "pros": ["Excellent performance", "Great value"],
                    "cons": ["Mediocre battery"],
                    "average_rating": "9.2/10"
                }},
                "product_456": {{
                    "pros": ["Reliable", "Good build"],
                    "cons": ["Outdated design"],
                    "average_rating": "8.7/10"
                }}
            }},
            "expert_consensus": "Both are solid choices, but Product A offers better future-proofing",
            "known_issues": ["Product B has reported WiFi connectivity issues"],
            "alternatives_suggested": ["Consider waiting for Product C release next month"],
            "best_choice": "product_123"
        }}

        Return ONLY valid JSON. Be specific and detailed in your analysis.
        """

        return prompt

    def _get_fallback_analysis(
        self, offers: List[Dict], tier: str, language: str
    ) -> Dict:
        """Enhanced fallback analysis with trend awareness"""
        if len(offers) == 1:
            offer = offers[0]
            trend_preview = offer.get("price_trend_preview", {})
            free_trend = trend_preview.get("free_price_trend", [])
            insights = self._extract_trend_insights(free_trend) if free_trend else {}

            # Create structured trend analysis
            structured_trend = {
                "trend": insights.get("direction", "unknown"),
                "change": insights.get("price_change_percent", 0),
                "change_percent": insights.get("price_change_percent", 0),
                "volatility": insights.get("volatility", 0),
                "momentum": insights.get("momentum", 0),
                "best_time": insights.get("best_time_to_buy", "unknown"),
                "in_stock": offer.get("in_stock", True),
                "risk": self._infer_risk_from_trend(insights),
                "recommendation": f"Price trend: {insights.get('direction', 'unknown')} with {insights.get('price_change_percent', 0)}% change. {insights.get('best_time_to_buy', 'Monitor price')}.",
            }

            return {
                "summary": f"Analysis of {offer.get('name')} at {offer.get('price')} MDL from {offer.get('shop')}.",
                "recommendation": structured_trend["recommendation"],
                "trend_analysis": {offer.get("id"): structured_trend},
                "expert_insights": {},
                "expert_consensus": "Expert review data unavailable",
                "known_issues": [],
                "alternatives_suggested": [],
                "best_choice": offer.get("id"),
                "analysis_tier": tier,
                "language": language,
                "analyzed_at": datetime.now().isoformat(),
                "fallback": True,
            }
        else:
            # Find best based on trend + price
            scored_offers = []
            trend_analysis_dict = {}

            for offer in offers:
                trend_preview = offer.get("price_trend_preview", {})
                free_trend = trend_preview.get("free_price_trend", [])
                insights = (
                    self._extract_trend_insights(free_trend) if free_trend else {}
                )

                # Create structured trend for each offer
                structured_trend = {
                    "trend": insights.get("direction", "unknown"),
                    "change": insights.get("price_change_percent", 0),
                    "change_percent": insights.get("price_change_percent", 0),
                    "volatility": insights.get("volatility", 0),
                    "momentum": insights.get("momentum", 0),
                    "best_time": insights.get("best_time_to_buy", "unknown"),
                    "in_stock": offer.get("in_stock", True),
                    "risk": self._infer_risk_from_trend(insights),
                    "recommendation": f"Price trend: {insights.get('direction', 'unknown')} with {insights.get('price_change_percent', 0)}% change.",
                }

                trend_analysis_dict[offer.get("id")] = structured_trend

                # Score: lower price + downward trend + momentum
                price_score = 10000 / max(
                    offer.get("price", 1), 1
                )  # Lower price = higher score
                trend_score = (
                    1.5
                    if insights.get("direction") == "down"
                    else 0.5 if insights.get("direction") == "up" else 1.0
                )
                momentum_score = 1 + max(
                    0, -insights.get("momentum", 0) / 10
                )  # Negative momentum (down) is good

                total_score = price_score * trend_score * momentum_score
                scored_offers.append((offer, total_score, structured_trend))

            # Sort by score
            scored_offers.sort(key=lambda x: x[1], reverse=True)
            best_offer, best_score, best_trend = scored_offers[0]

            return {
                "summary": f"Compared {len(offers)} products with trend analysis.",
                "recommendation": f"Best choice: {best_offer.get('shop')} at {best_offer.get('price')} MDL. "
                f"Trend: {best_trend['trend']} with {best_trend['change_percent']}% change.",
                "trend_analysis": trend_analysis_dict,
                "expert_insights": {},
                "expert_consensus": "Expert review data unavailable",
                "known_issues": [],
                "alternatives_suggested": [],
                "best_choice": best_offer.get("id"),
                "analysis_tier": tier,
                "language": language,
                "analyzed_at": datetime.now().isoformat(),
                "fallback": True,
            }
