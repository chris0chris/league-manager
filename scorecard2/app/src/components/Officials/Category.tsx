import { useState } from "react";
import { Row } from "react-bootstrap";
import {
  ScorecardCategory,
  SelectedCategory,
} from "../../types/gameSetup.types";
import RadioButton from "../shared/RadioButton";

type Props = {
  value: ScorecardCategory;
  home: string;
  away: string;
  onCategoryChange: (categories: SelectedCategory) => void;
};

const Category: React.FC<Props> = ({
  value: category,
  home = "home",
  away = "away",
  onCategoryChange,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<SelectedCategory>({
    id: -1,
    valueId: -1,
  });

  const addOrUpdateCategory = (newCategory: SelectedCategory) => {
    console.log("addOrUpdateCategory newCategory.id", newCategory.id);
    if (newCategory.valueId !== selectedCategory.valueId) {
      setSelectedCategory(newCategory);
      onCategoryChange(newCategory);
    }
  };
  return (
    <>
      <Row className="mt-3">
        <div>
          {category.name}
          {`${category.is_required ? "* " : ""}`}
          {category.team_option !== "none" && (
            <span className="fw-bold" data-testid="ctTeam">
              {`${category.team_option === "home" ? home : away}`}
            </span>
          )}
        </div>
      </Row>
      <Row className="mt-1">
        {category.values.map((currentValue, index) => (
          <RadioButton
            className="mt-2"
            key={index}
            id={currentValue.value + index}
            name={category.name}
            required={category.is_required}
            color="secondary"
            onChange={(valueId: number) =>
              addOrUpdateCategory({
                id: category.id,
                valueId: valueId,
              })
            }
            text={currentValue.value}
            value={currentValue.id}
            checked={selectedCategory.valueId === currentValue.id}
          />
        ))}
      </Row>
    </>
  );
};
export default Category;
