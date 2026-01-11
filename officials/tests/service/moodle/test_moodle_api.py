import os

import pytest

from officials.service.moodle.moodle_api import (
    MoodleApi,
    ApiUserInfo,
    ApiCourses,
    ApiParticipants,
    ApiExams,
    ApiExam,
    ApiExamResult,
)


class TestMoodleApi:

    @pytest.mark.skipif("CIRCLECI" in os.environ, reason="CIRCLECI will reveal secrets")
    def test_get_all_courses(self):
        moodle_api = MoodleApi()
        all_courses: ApiCourses = moodle_api.get_courses()
        assert len(all_courses.get_all()) > 1

    @pytest.mark.skipif("CIRCLECI" in os.environ, reason="CIRCLECI will reveal secrets")
    def test_get_all_participants_for_course(self):
        moodle_api = MoodleApi()
        participants: ApiParticipants = moodle_api.get_participants_for_course(5)
        all_participants: list[ApiUserInfo] = participants.get_all()
        assert len(all_participants) == 4
        assert (
            str(all_participants[3])
            == "11: Testuser, Y -> Ich finde mein Team nicht. (-99)"
        )

    @pytest.mark.skipif("CIRCLECI" in os.environ, reason="CIRCLECI will reveal secrets")
    def test_get_all_exams_for_course(self):
        moodle_api = MoodleApi()
        api_exams: ApiExams = moodle_api.get_exams_for_course(5)
        all_exams: list[ApiExam] = api_exams.get_all()
        assert len(all_exams) == 1
        assert str(all_exams[0]) == "5: quiz_id=1 -> grade: 10.0"

    @pytest.mark.skipif("CIRCLECI" in os.environ, reason="CIRCLECI will reveal secrets")
    def test_get_user_result_for_exam(self):
        moodle_api = MoodleApi()
        result: ApiExamResult = moodle_api.get_user_result_for_exam(11, 1)
        assert result.get_result() == 1

    @pytest.mark.skipif("CIRCLECI" in os.environ, reason="CIRCLECI will reveal secrets")
    def test_get_user_result_for_non_existing_exam(self):
        moodle_api = MoodleApi()
        result: ApiExamResult = moodle_api.get_user_result_for_exam(7, 1)
        assert result.get_result() is None

    @pytest.mark.skipif("CIRCLECI" in os.environ, reason="CIRCLECI will reveal secrets")
    def test_get_user_info(self):
        moodle_api = MoodleApi()
        user_info: ApiUserInfo = moodle_api.get_user_info_by_id(11)
        assert user_info.get_first_name() == "Y"
        assert user_info.get_last_name() == "Testuser"
        assert user_info.get_team() == "Ich finde mein Team nicht."
        assert user_info.get_team_id() == "-99"
