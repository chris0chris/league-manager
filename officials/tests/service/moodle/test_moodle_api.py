from officials.service.moodle.moodle_api import MoodleApi, ApiUserInfo, ApiCourses, ApiParticipants


class TestMoodleApi:

    def test_get_all_courses(self):
        moodle_api = MoodleApi()
        all_courses: ApiCourses = moodle_api.get_courses()
        assert len(all_courses.get_all()) > 1

    def test_get_all_participants_for_course(self):
        moodle_api = MoodleApi()
        participants: ApiParticipants = moodle_api.get_participants_for_course(5)
        all_participants = participants.get_all()
        assert len(all_participants) == 4
        assert all_participants[3].get_result() == 13
        assert all_participants[3].get_user_id() == 11

    def test_get_user_info(self):
        moodle_api = MoodleApi()
        user_info: ApiUserInfo = moodle_api.get_user_info(11)
        assert user_info.get_first_name() == 'Y'
        assert user_info.get_last_name() == 'Testuser'
        assert user_info.get_team() == 'Ich finde mein Team nicht.'
