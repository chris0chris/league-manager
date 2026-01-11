import json
import pathlib

from pandas import DataFrame


class DataFrameWrapper:
    def __init__(self, dataframe: DataFrame):
        self.dataframe = dataframe

    def to_equal_json(self, filename):
        actual = JsonHelper.loads(self.dataframe.to_json(orient="table"))
        expected = JsonHelper.read_file(filename)

        # Normalize schema "type" mismatches (Pandas 1.x vs 2.x)
        for field in actual.get("schema", {}).get("fields", []):
            if field.get("type") == "any":
                field["type"] = "string"

        for field in expected.get("schema", {}).get("fields", []):
            if field.get("type") == "any":
                field["type"] = "string"

        assert actual == expected, f"\nExpected:\n{expected}\n\nGot:\n{actual}"


class DataFrameAssertion(object):

    @classmethod
    def expect(cls, dataframe: DataFrame):
        return DataFrameWrapper(dataframe)


class JsonHelper(object):
    @staticmethod
    def read_file(filename) -> dict:
        with open(pathlib.Path(__file__).parent / "testdata" / f"{filename}.json") as f:
            expected_gamelog = json.load(f)
        return expected_gamelog

    @staticmethod
    def loads(json_str) -> dict:
        return json.loads(json_str)
