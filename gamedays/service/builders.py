import pandas as pd

from gamedays.service.gameday_service import (
    HtmlAndJsonRendering,
)


class TableContextBuilder:
    GROUP_CLASSES = [
        "",
        "table-light",
        "table-secondary",
        "table-info",
        "table-warning",
        "table-primary",
        "table-dark",
        "table-success",
        "table-danger",
    ]

    @classmethod
    def build(cls, table: pd.DataFrame) -> dict | None:
        if isinstance(table, HtmlAndJsonRendering):
            return {
                "table": [],
                "columns": [],
                "is_empty": True,
                "html": table.to_html(),
            }
        table["round_index"] = (
            table["standing"].ne(table["standing"].shift()).fillna(True).cumsum() - 1
        )

        table["bg_class"] = table["round_index"].map(
            lambda i: cls.GROUP_CLASSES[i % len(cls.GROUP_CLASSES)]
        )

        table = table.drop(columns=["round_index"])

        return {
            "table": table.to_dict(orient="records"),
            "columns": table.columns,
            "is_empty": False,
            "html": None,
        }
