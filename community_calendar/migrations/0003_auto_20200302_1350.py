# Generated by Django 2.2.10 on 2020-03-02 13:50

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('community_calendar', '0002_auto_20190808_0455'),
    ]

    operations = [
        migrations.AlterField(
            model_name='event',
            name='moderated_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='moderator', to=settings.AUTH_USER_MODEL),
        ),
    ]
