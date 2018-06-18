# -*- coding: utf-8 -*-
# Generated by Django 1.11.6 on 2018-03-20 13:19
from __future__ import unicode_literals

from django.db import migrations
import uuid

def gen_uuid(apps, schema_editor):
    StudyGroup = apps.get_model('studygroups', 'StudyGroup')
    for row in StudyGroup.objects.all():
        row.uuid = uuid.uuid4()
        row.save(update_fields=['uuid'])

    Application = apps.get_model('studygroups', 'Application')
    for row in Application.objects.all():
        row.uuid = uuid.uuid4()
        row.save(update_fields=['uuid'])



class Migration(migrations.Migration):

    dependencies = [
        ('studygroups', '0089_studygroup_uuid'),
    ]

    operations = [
        migrations.RunPython(gen_uuid, reverse_code=migrations.RunPython.noop),
    ]