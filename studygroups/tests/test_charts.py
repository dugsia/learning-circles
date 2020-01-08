# coding: utf-8
from django.test import TestCase
from django.test import Client
from django.utils import timezone

from mock import patch, Mock

from studygroups.models import StudyGroup
from studygroups.models import Meeting
from studygroups.models import Application
from surveys.models import LearnerSurveyResponse
from surveys.models import FacilitatorSurveyResponse

from studygroups.charts import get_question_field
from studygroups.charts import get_response_field
from studygroups.charts import save_to_aws
from studygroups.charts import GoalsMetChart
from studygroups.charts import NewLearnersChart
from studygroups.charts import CompletionRateChart
from studygroups.charts import LearnerRatingChart
from studygroups.charts import FacilitatorRatingChart
from studygroups.charts import OverallRatingBarChart
from studygroups.charts import NO_DATA

import json
import pygal


class TestCharts(TestCase):

    fixtures = ['test_courses.json', 'test_studygroups.json', 'test_applications.json', 'test_survey_responses.json']

    def test_get_question_field_returns_with_valid_id(self):
        studygroup = StudyGroup.objects.get(pk=1)
        question_id = "IO9ALWvVYE3n" # "To what extend did you meet your goal?"

        result = get_question_field(studygroup, question_id)

        self.assertEqual(result["id"], question_id)
        self.assertEqual(result["title"], "To what extent did you meet your goal?")


    def test_get_question_field_returns_with_invalid_id(self):
        studygroup = StudyGroup.objects.get(pk=1)
        question_id = "bleep"

        result = get_question_field(studygroup, question_id)

        self.assertIsNone(result)


    def test_get_response_field_with_valid_id(self):
        question_id = "IO9ALWvVYE3n" # "To what extend did you meet your goal?"
        survey_response = LearnerSurveyResponse.objects.get(pk=1)

        result = get_response_field(survey_response.response, question_id)

        self.assertEqual(result["field"]["id"], question_id)
        self.assertIsNotNone(result["number"])


    def test_get_response_field_with_invalid_id(self):
        question_id = "bloop" # "To what extend did you meet your goal?"
        survey_response = LearnerSurveyResponse.objects.get(pk=1)

        result = get_response_field(survey_response.response, question_id)

        self.assertIsNone(result)


    @patch('studygroups.charts.save_to_aws')
    def test_goals_met_chart_with_responses(self, mock_aws):
        study_group = StudyGroup.objects.get(pk=1)
        chart_object = GoalsMetChart(study_group)
        mock_aws.configure_mock(return_value = "test.png")
        survey_response = LearnerSurveyResponse.objects.filter(study_group=study_group).last()

        chart_data = chart_object.get_data()
        self.assertIsNotNone(chart_data.get("Rating"))

        svg_result = chart_object.generate()

        self.assertIn('xmlns:xlink="http://www.w3.org/1999/xlink"', svg_result)
        self.assertIn("Rating", svg_result)

        png_result = chart_object.generate(output="png")

        mock_aws.assert_called()
        self.assertIn('Goal met chart', png_result)

        self.assertIn("test.png", png_result)

    def test_goals_met_chart_no_responses(self):
        study_group = StudyGroup.objects.get(pk=2)
        result = GoalsMetChart(study_group).generate()
        self.assertEqual(result, NO_DATA)


    @patch('studygroups.charts.save_to_aws')
    def test_new_learners_chart_with_responses(self, mock_aws):
        study_group = StudyGroup.objects.get(pk=1)
        chart_object = NewLearnersChart(study_group)
        mock_aws.configure_mock(return_value = "test.png")
        survey_response = LearnerSurveyResponse.objects.filter(study_group=study_group).last()

        self.assertTrue(isinstance(chart_object.chart, pygal.graph.solidgauge.SolidGauge))

        chart_data = chart_object.get_data()
        self.assertIsNotNone(chart_data["New learners"][0]["value"])
        self.assertIsNotNone(chart_data["New learners"][0]["max_value"])

        svg_result = chart_object.generate()

        self.assertIn('xmlns:xlink="http://www.w3.org/1999/xlink"', svg_result)

        png_result = chart_object.generate(output="png")

        mock_aws.assert_called()
        self.assertIn('New learners chart', png_result)
        self.assertIn("test.png", png_result)


    def test_new_learners_chart_no_responses(self):
        study_group = StudyGroup.objects.get(pk=2)
        result = NewLearnersChart(study_group).generate()
        self.assertEqual(result, NO_DATA)


    @patch('studygroups.charts.get_response_field')
    @patch('studygroups.charts.save_to_aws')
    def test_completion_rate_chart_with_responses(self, mock_aws, mock_get_response_field):
        study_group = StudyGroup.objects.get(pk=1)
        chart_object = CompletionRateChart(study_group)
        mock_aws.configure_mock(return_value = "test.png")
        mock_get_response_field.configure_mock(wraps=get_response_field)
        survey_response = LearnerSurveyResponse.objects.filter(study_group=study_group).last()

        self.assertTrue(isinstance(chart_object.chart, pygal.graph.solidgauge.SolidGauge))

        chart_data = chart_object.get_data()
        mock_get_response_field.assert_called_with(survey_response.response, 'i7ps4iNBVya0')
        self.assertIsNotNone(chart_data["Completed"][0]["value"])
        self.assertIsNotNone(chart_data["Completed"][0]["max_value"])

        svg_result = chart_object.generate()

        self.assertIn('xmlns:xlink="http://www.w3.org/1999/xlink"', svg_result)

        png_result = chart_object.generate(output="png")

        mock_aws.assert_called()
        self.assertIn('Completion rate chart', png_result)
        self.assertIn("test.png", png_result)


    def test_completion_rate_chart_no_responses(self):
        study_group = StudyGroup.objects.get(pk=2)
        result = CompletionRateChart(study_group).generate()
        self.assertEqual(result, NO_DATA)


    @patch('studygroups.charts.save_to_aws')
    def test_completion_rate_chart_with_responses(self, mock_aws, ):
        study_group = StudyGroup.objects.get(pk=1)
        # TODO - this would need meetings with feedback or a response to the new survey
        return
        chart_object = CompletionRateChart(study_group)
        mock_aws.configure_mock(return_value = "test.png")
        survey_response = LearnerSurveyResponse.objects.filter(study_group=study_group).last()

        self.assertTrue(isinstance(chart_object.chart, pygal.graph.solidgauge.SolidGauge))

        chart_data = chart_object.get_data()
        self.assertIsNotNone(chart_data["Completed"][0]["value"])
        self.assertIsNotNone(chart_data["Completed"][0]["max_value"])

        svg_result = chart_object.generate()

        self.assertIn('xmlns:xlink="http://www.w3.org/1999/xlink"', svg_result)

        png_result = chart_object.generate(output="png")

        mock_aws.assert_called()
        self.assertIn('Completion rate chart', png_result)
        self.assertIn("test.png", png_result)


    def test_completion_rate_chart_no_responses(self):
        study_group = StudyGroup.objects.get(pk=2)
        result = CompletionRateChart(study_group).generate()
        self.assertEqual(result, NO_DATA)


    @patch('studygroups.charts.save_to_aws')
    def test_learner_rating_chart_with_responses(self, mock_aws):
        study_group = StudyGroup.objects.get(pk=1)
        chart_object = LearnerRatingChart(study_group)
        mock_aws.configure_mock(return_value = "test.png")
        survey_response = LearnerSurveyResponse.objects.filter(study_group=study_group).last()

        chart_data = chart_object.get_data()
        self.assertIsNotNone(chart_data["average_rating"])
        self.assertIsNotNone(chart_data["maximum"])

        result = chart_object.generate()
        self.assertIn("<div class='course-rating row justify-content-around text-warning'>", result)


    def test_learner_rating_chart_no_responses(self):
        study_group = StudyGroup.objects.get(pk=2)
        result = LearnerRatingChart(study_group).generate()
        self.assertEqual(result, NO_DATA)


    @patch('studygroups.charts.get_response_field')
    @patch('studygroups.charts.save_to_aws')
    def test_facilitator_rating_chart_with_responses(self, mock_aws, mock_get_response_field):
        study_group = StudyGroup.objects.get(pk=1)
        chart_object = FacilitatorRatingChart(study_group)
        mock_aws.configure_mock(return_value = "test.png")
        mock_get_response_field.configure_mock(wraps=get_response_field)
        survey_response = FacilitatorSurveyResponse.objects.last()

        chart_data = chart_object.get_data()
        mock_get_response_field.assert_called_with(survey_response.response, 'Zm9XlzKGKC66')
        self.assertIsNotNone(chart_data["average_rating"])
        self.assertIsNotNone(chart_data["maximum"])

        result = chart_object.generate()
        self.assertIn("<div class='course-rating row justify-content-around text-warning'>", result)


    def test_facilitator_rating_chart_no_responses(self):
        study_group = StudyGroup.objects.get(pk=2)
        result = FacilitatorRatingChart(study_group).generate()
        self.assertEqual(result, NO_DATA)


    def test_overall_rating_bar_chart(self):
        chart_data = {
            5: 0,
            4: 0,
            3: 0,
            2: 0,
            1: 0,
        }

        chart_object = OverallRatingBarChart(chart_data)
        result = chart_object.generate()
        self.assertIn('xmlns:xlink="http://www.w3.org/1999/xlink"', result)

