# -*- coding: utf-8 -*-
# Generated by Django 1.11.6 on 2018-10-12 09:31
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('studygroups', '0101_auto_20181009_1210'),
    ]

    operations = [
        migrations.AddField(
            model_name='studygroup',
            name='attach_ics',
            field=models.BooleanField(default=False),
        ),
    ]
