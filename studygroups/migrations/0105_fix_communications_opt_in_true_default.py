# -*- coding: utf-8 -*-
# Generated by Django 1.11.6 on 2018-10-25 15:55
from __future__ import unicode_literals

from django.db import migrations
from django.utils.timezone import utc

import datetime

def fix_opt_in(apps, schema_editor):
    Profile = apps.get_model('studygroups', 'Profile')
    for profile in Profile.objects.all():
        if profile.user.date_joined < datetime.datetime(2018, 9, 26, tzinfo=utc): # date when faulty migration was run
            profile.communication_opt_in = profile.mailing_list_signup
            profile.save()


class Migration(migrations.Migration):

    dependencies = [
        ('studygroups', '0104_auto_20181025_0911'),
    ]

    operations = [
        migrations.RunPython(fix_opt_in, reverse_code=migrations.RunPython.noop),
    ]
