# -*- coding: utf-8 -*-
# Generated by Django 1.10.6 on 2017-08-23 13:56
from __future__ import unicode_literals

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('studygroups', '0073_studygroup_lat_lon'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='course',
            name='key',
        ),
    ]