# -*- coding: utf-8 -*-
# Generated by Django 1.11.6 on 2018-08-26 19:16
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('studygroups', '0096_delete_activity'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='reason_for_registration',
            field=models.CharField(choices=[('Learn', 'Learn'), ('Facilitate', 'Facilitate'), ('Join the community', 'Join the community')], default='Facilitate', max_length=30),
        ),
    ]
