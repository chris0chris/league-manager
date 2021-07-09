import json
import pathlib

from pandas import DataFrame


class DataFrameWrapper:
    def __init__(self, dataframe: DataFrame):
        self.dataframe = dataframe

    def to_equal_json(self, filename):
        assert JsonHelper.read_file(filename) == JsonHelper.loads(self.dataframe.to_json(orient='table'))


class DataFrameAssertion(object):

    @classmethod
    def expect(cls, dataframe: DataFrame):
        return DataFrameWrapper(dataframe)


class JsonHelper(object):
    @staticmethod
    def read_file(filename) -> dict:
        with open(pathlib.Path(__file__).parent / 'testdata' / filename) as f:
            expected_gamelog = json.load(f)
        return expected_gamelog

    @staticmethod
    def loads(json_str) -> dict:
        return json.loads(json_str)
