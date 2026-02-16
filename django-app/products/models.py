from django.db import transaction
from django.db import models
from django.utils import timezone
from products.utils.log.shop_crawler_engine_log import shop_crawler_log


""" 

Delete behavior

Deleting a Product → ProductPriceHistory survives because on_delete=SET_NULL.

Archiving a Product → price history is relinked to the ArchivedProduct.

Deleting an ArchivedProduct → same, history survives if needed (on_delete=SET_NULL).



Analytics and statistics are never lost.

You can explicitly control archiving without interfering with deletion.

Unique constraint prevents accidental duplicates.

Clear distinction between Product (current) and ArchivedProduct (past/out-of-stock).


 """


class Product(models.Model):
    external_id = models.CharField(max_length=50, null=False)
    name = models.CharField(max_length=255, null=False, blank=True)
    brand = models.CharField(max_length=100, null=False)
    category = models.CharField(max_length=100, null=False)

    similar_id = models.CharField(
        max_length=40,
        db_index=True,
        null=True,
        blank=True,
    )
    identical_id = models.CharField(
        max_length=40,
        db_index=True,
        null=True,
        blank=True,
    )

    variant = models.CharField(max_length=50, null=True, blank=True)
    embedding = models.TextField(blank=True, null=True)

    price = models.DecimalField(max_digits=12, decimal_places=2)

    url = models.URLField()
    image = models.URLField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(default=timezone.now)
    shop = models.CharField(max_length=50, default="")
    in_stock = models.BooleanField(default=True)
    t_name = models.JSONField(default=dict, null=True, blank=True)
    t_variant = models.JSONField(default=dict, null=True, blank=True)
    t_category = models.JSONField(default=dict, null=True, blank=True)

    # ---- PRICE HISTORY ---- #
    @property
    def price_history_ordered(self):
        return self.price_history.order_by("-recorded_at")

    @property
    def last_price_change(self):
        last = self.price_history.order_by("-recorded_at").first()
        return last.price if last else None

    # ---- PIPELINE CONTROL FIELDS ----
    dirty = models.BooleanField(default=False)  # "needs downstream processing"

    def __str__(self):
        return f"{self.name} ({self.brand})"

    class Meta:
        unique_together = ("shop", "external_id")

    def archive(self, db=None):
        """
        Archive this product, moving its price history to an ArchivedProduct.
        """
        from products.models import ArchivedProduct

        db = db or "default"

        try:
            with transaction.atomic(using=db):

                name = self.name or ""
                external_id = self.external_id or ""
                brand = self.brand or ""
                category = self.category or ""

                archived = ArchivedProduct.objects.using(db).create(
                    original_id=self.id,
                    external_id=external_id,
                    similar_id=self.similar_id or "",
                    identical_id=self.identical_id or "",
                    name=name,
                    variant=self.variant,
                    embedding=self.embedding,
                    brand=brand,
                    category=category,
                    t_name=self.t_name,
                    t_variant=self.t_variant,
                    t_category=self.t_category,
                    url=self.url,
                    image=self.image,
                    price=self.price,
                    in_stock=False,
                    shop=self.shop,
                    archived_at=timezone.now(),
                    dirty=False,
                )

                return archived
        except Exception as e:
            shop_crawler_log(
                f"ERROR archiving product {self.name} ({self.external_id}) in DB '{db}': {e}"
            )
            return None

    def archive_broken(self, db=None):
        """
        Archive a product as broken (price=0) and create initial price history.
        """
        from products.models import ArchivedBrokenProduct

        db = db or "default"

        try:
            with transaction.atomic(using=db):
                archived_broken = ArchivedBrokenProduct.objects.using(db).create(
                    original_id=self.id,
                    external_id=self.external_id,
                    similar_id=self.similar_id or "",
                    identical_id=self.identical_id or "",
                    name=self.name or "Unknown",
                    variant=self.variant,
                    embedding=self.embedding,
                    brand=self.brand,
                    category=self.category,
                    t_name=self.t_name,
                    t_variant=self.t_variant,
                    t_category=self.t_category,
                    url=self.url or "",
                    image=self.image or "",
                    dirty=False,
                    price=0,
                    in_stock=False,  # I imply its false
                    shop=self.shop,
                    archived_at=timezone.now(),
                )

                return archived_broken

        except Exception as e:
            shop_crawler_log(
                f"ERROR archiving broken product {self.name} ({self.external_id}) in DB '{db}': {e}"
            )
            return None

    def archive_missing(self, db=None):
        """
        Archive this product as 'missing', move all its data to ArchivedProduct,
        and remove the active Product row using (shop, external_id) as source of truth.
        """
        from products.models import ArchivedProduct, Product

        db = db or "default"

        try:
            with transaction.atomic(using=db):

                # Remove any previous archive snapshot
                ArchivedProduct.objects.using(db).filter(
                    shop=self.shop,
                    external_id=self.external_id,
                ).delete()

                # Create new archive snapshot
                archived = ArchivedProduct.objects.using(db).create(
                    original_id=self.id,
                    external_id=self.external_id,
                    similar_id=self.similar_id,
                    identical_id=self.identical_id,
                    name=self.name,
                    variant=self.variant,
                    price=self.price,
                    in_stock=self.in_stock,
                    dirty=False,
                    shop=self.shop,
                    archived_at=timezone.now(),
                )

                # Delete active product(s) by source-of-truth key
                Product.objects.using(db).filter(
                    shop=self.shop,
                    external_id=self.external_id,
                ).delete()

                return archived

        except Exception as e:
            shop_crawler_log(
                f"ERROR archiving missing product "
                f"{self.name} ({self.external_id}) in DB '{db}': {e}"
            )
            return None

    @classmethod
    def archive_batch(cls, queryset, db=None):
        """
        Archive a queryset of products in batches, moving their price history
        to ArchivedProduct reliably.
        """
        from products.models import ArchivedProduct

        db = db or "default"
        archived_count = 0
        failed_count = 0
        total = queryset.count()

        for start in range(0, total, cls.BATCH_ARCHIVE_SIZE):
            batch = list(queryset[start : start + cls.BATCH_ARCHIVE_SIZE])

            try:
                with transaction.atomic(using=db):
                    archived_objs = []
                    for p in batch:
                        archived = ArchivedProduct.objects.using(db).create(
                            original_id=p.id,
                            external_id=p.external_id,
                            similar_id=p.similar_id or "",
                            identical_id=p.identical_id or "",
                            name=p.name,
                            variant=p.variant,
                            embedding=p.embedding,
                            brand=p.brand,
                            category=p.category,
                            t_name=p.t_name,
                            t_variant=p.t_variant,
                            t_category=p.t_category,
                            url=p.url,
                            image=p.image,
                            price=p.price,
                            in_stock=False,
                            dirty=False,
                            shop=p.shop,
                            archived_at=timezone.now(),
                        )
                        archived_objs.append((p, archived))

                    archived_count += len(batch)

            except Exception as e:
                failed_count += len(batch)
                for p in batch:
                    shop_crawler_log(
                        f"ERROR archiving product {p.name} ({p.external_id}) in DB '{db}': {e}"
                    )

        return {"archived": archived_count, "failed": failed_count}

    @classmethod
    def unarchive_batch(cls, archived_queryset, db=None):
        """
        Restore ArchivedProducts back to Product in batches.
        Moves price history back to Product.
        """
        from products.models import Product

        db = db or "default"
        restored_count = 0
        failed_count = 0
        batch_size = cls.BATCH_ARCHIVE_SIZE
        total = archived_queryset.count()

        for start in range(0, total, batch_size):
            batch = list(archived_queryset[start : start + batch_size])

            try:
                with transaction.atomic(using=db):
                    restored_objs = []
                    for a in batch:
                        product = Product.objects.using(db).create(
                            external_id=a.external_id,
                            similar_id=a.similar_id or "",
                            identical_id=a.identical_id or "",
                            name=a.name,
                            variant=a.variant,
                            embedding=a.embedding,
                            brand=a.brand,
                            category=a.category,
                            t_name=a.t_name,
                            t_variant=a.t_variant,
                            t_category=a.t_category,
                            url=a.url,
                            image=a.image,
                            price=a.price,
                            in_stock=a.in_stock,
                            shop=a.shop,
                            dirty=a.dirty,
                            created_at=timezone.now(),
                            updated_at=timezone.now(),
                        )
                        restored_objs.append((a, product))

                    restored_count += len(batch)

            except Exception as e:
                failed_count += len(batch)
                for a in batch:
                    shop_crawler_log(
                        f"ERROR unarchiving product {a.name} ({a.external_id}) in DB '{db}': {e}"
                    )

        return {"restored": restored_count, "failed": failed_count}

    @classmethod
    def unarchive(cls, archived_obj, db=None):
        """
        Restore a single ArchivedProduct back to active Product.
        Moves price history back to Product.
        """

        db = db or "default"

        try:
            with transaction.atomic(using=db):
                # Create new Product from ArchivedProduct fields
                restored = cls.objects.using(db).create(
                    external_id=archived_obj.external_id,
                    similar_id=archived_obj.similar_id or "",
                    identical_id=archived_obj.identical_id or "",
                    name=archived_obj.name,
                    variant=archived_obj.variant,
                    embedding=archived_obj.embedding,
                    brand=archived_obj.brand,
                    category=archived_obj.category,
                    t_name=archived_obj.t_name,
                    t_variant=archived_obj.t_variant,
                    t_category=archived_obj.t_category,
                    url=archived_obj.url,
                    image=archived_obj.image,
                    price=archived_obj.price,
                    in_stock=True,  # active again
                    shop=archived_obj.shop,
                    dirty=True,  # pick up downstream
                    created_at=timezone.now(),
                    updated_at=timezone.now(),
                )

                shop_crawler_log(
                    f"UNARCHIVED {restored.name} ({restored.external_id}) from ArchivedProduct"
                )

                return restored

        except Exception as e:
            shop_crawler_log(
                f"ERROR unarchiving {archived_obj.name} ({archived_obj.external_id}): {e}"
            )
            return None


# store embeddings for user search queries
class UserQueryEmbedding(models.Model):
    query_text = models.TextField()
    embedding = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)


# given a this query how similar is each product
class PrecomputedSimilarity(models.Model):
    user_query = models.ForeignKey(UserQueryEmbedding, on_delete=models.CASCADE)
    product = models.ForeignKey("Product", on_delete=models.CASCADE)
    similarity = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)


class AutocompleteToken(models.Model):
    context = models.CharField(max_length=255, db_index=True)
    next_token = models.CharField(max_length=64, db_index=True)
    count = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ("context", "next_token")
        indexes = [
            models.Index(fields=["context"]),
            models.Index(fields=["next_token"]),
        ]

    def __str__(self):
        return f"{self.context} -> {self.next_token} ({self.count})"


class ArchivedProduct(models.Model):
    original_id = models.IntegerField(db_index=True, null=True)
    external_id = models.CharField(max_length=50, null=False)
    similar_id = models.CharField(max_length=40, null=True, blank=True)
    identical_id = models.CharField(max_length=40, null=True, blank=True)
    name = models.CharField(max_length=255, null=False, blank=True)
    variant = models.CharField(max_length=50, null=True, blank=True)
    embedding = models.TextField(blank=True, null=True)
    brand = models.CharField(max_length=100, null=False, blank=True)
    category = models.CharField(max_length=100, null=False)
    t_name = models.JSONField(default=dict, null=True, blank=True)
    t_variant = models.JSONField(default=dict, null=True, blank=True)
    t_category = models.JSONField(default=dict, null=True, blank=True)
    url = models.URLField(blank=True)
    image = models.URLField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    in_stock = models.BooleanField(default=False)
    shop = models.CharField(max_length=50)
    archived_at = models.DateTimeField(auto_now_add=True)
    dirty = models.BooleanField(default=False)  # "needs downstream processing"

    class Meta:
        unique_together = ("shop", "external_id")
        indexes = [
            models.Index(fields=["external_id"]),
            models.Index(fields=["similar_id"]),
            models.Index(fields=["shop"]),
        ]


class ArchivedBrokenProduct(models.Model):
    original_id = models.IntegerField(db_index=True, null=True)
    external_id = models.CharField(max_length=50, null=False)
    similar_id = models.CharField(max_length=40, null=True, blank=True)
    identical_id = models.CharField(max_length=40, null=True, blank=True)
    name = models.CharField(max_length=255, null=False, blank=True)
    variant = models.CharField(max_length=50, null=True, blank=True)
    embedding = models.TextField(blank=True, null=True)
    brand = models.CharField(max_length=100, null=False, blank=True)
    category = models.CharField(max_length=100, null=False)
    t_name = models.JSONField(default=dict, null=True, blank=True)
    t_variant = models.JSONField(default=dict, null=True, blank=True)
    t_category = models.JSONField(default=dict, null=True, blank=True)
    url = models.URLField(blank=True)
    image = models.URLField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    in_stock = models.BooleanField(default=False)
    shop = models.CharField(max_length=50)
    archived_at = models.DateTimeField(auto_now_add=True)
    dirty = models.BooleanField(default=False)  # "needs downstream processing"

    class Meta:
        unique_together = ("shop", "external_id")
        indexes = [
            models.Index(fields=["external_id"]),
            models.Index(fields=["similar_id"]),
            models.Index(fields=["shop"]),
        ]


class CrawlSnapshot(models.Model):
    shop = models.CharField(max_length=50)
    external_ids = models.JSONField(default=list)  # store list of strings
    created_at = models.DateTimeField(auto_now_add=True)


class ProductPriceHistory(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="price_history",
    )
    archived_product = models.ForeignKey(
        ArchivedProduct,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="archived_price_history",
    )
    archived_broken_product = models.ForeignKey(
        ArchivedBrokenProduct,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="archived_broken_price_history",
    )
    shop = models.CharField(
        max_length=50, db_index=True, null=True
    )  # <-- preserve shop

    price = models.DecimalField(max_digits=12, decimal_places=2)
    in_stock = models.BooleanField(default=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

    @staticmethod
    def link_to_product(history_qs, product):
        """
        Link a queryset of price history rows to a Product.
        Sets archived_product to None.
        """
        history_qs.update(product=product, archived_product=None)

    @staticmethod
    def link_to_archived(history_qs, archived):
        """
        Link a queryset of price history rows to an ArchivedProduct.
        Sets product to None.
        """
        history_qs.update(product=None, archived_product=archived)

    @staticmethod
    def link_to_broken(history_qs, broken):
        history_qs.update(
            product=None, archived_product=None, archived_broken_product=broken
        )

    class Meta:
        indexes = [
            models.Index(fields=["shop", "recorded_at"]),
            models.Index(fields=["product", "recorded_at"]),
            models.Index(fields=["archived_product", "recorded_at"]),
            models.Index(fields=["archived_broken_product", "recorded_at"]),
        ]
        unique_together = [
            ("product", "recorded_at"),
            ("archived_product", "recorded_at"),
            ("archived_broken_product", "recorded_at"),
        ]
        ordering = ["-recorded_at"]

    def __str__(self):
        target = self.product or self.archived_product
        if target:
            return f"{target.name} | {self.price} at {self.recorded_at}"
        else:
            return f"Orphaned ({self.shop}) | {self.price} at {self.recorded_at}"


class ProductAnalytics(models.Model):
    product = models.OneToOneField(
        "Product",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="analytics",
    )
    archived_product = models.OneToOneField(
        "ArchivedProduct",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="analytics",
    )

    # Price metrics
    first_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    last_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    max_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    min_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    avg_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    price_change_count = models.DecimalField(max_digits=12, decimal_places=2)

    # Stock metrics
    total_days_in_stock = models.IntegerField(default=0)
    total_days_out_of_stock = models.IntegerField(default=0)
    last_in_stock = models.BooleanField(default=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["product"]),
            models.Index(fields=["archived_product"]),
        ]

    def __str__(self):
        target = self.product or self.archived_product
        return f"Analytics for {target.name} ({target.external_id})"


class Email(models.Model):
    email = models.EmailField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.email


class SystemState(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.CharField(max_length=255)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.key} = {self.value}"
