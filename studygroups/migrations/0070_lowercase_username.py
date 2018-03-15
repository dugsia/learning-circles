# -*- coding: utf-8 -*-
# Generated by Django 1.10.6 on 2017-04-13 10:57


from django.db import migrations
from collections import Counter


def eliminate_duplicates(apps, schema_editor):
    User = apps.get_model('auth', 'User')

    # find duplicate users
    c = Counter([u[0].lower() for u in User.objects.values_list('username')])
    while len(c.most_common()) and c.most_common()[0][1] > 1:
        username = c.most_common()[0][0]
        # De-duplicate user
        user_accounts = User.objects.filter(username__iexact=username)
        for user in user_accounts.order_by('last_login')[1:]:
            user.delete()

        del c[username]


def lowercase_usernames(apps, schema_editor):
    User = apps.get_model('auth', 'User')
    for user in User.objects.all():
        user.username = user.username.lower()
        user.save()


class Migration(migrations.Migration):

    dependencies = [
        ('studygroups', '0069_auto_20170322_1305'),
    ]

    operations = [
        migrations.RunPython(eliminate_duplicates),
        migrations.RunPython(lowercase_usernames)
    ]
