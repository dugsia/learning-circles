# -*- coding: utf-8 -*-
# Generated by Django 1.11.6 on 2019-03-12 15:19
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('studygroups', '0110_auto_20190312_0105'),
    ]

    operations = [
        migrations.AlterField(
            model_name='course',
            name='overall_rating',
            field=models.FloatField(default=0),
        ),
    ]
