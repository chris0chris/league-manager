import { useState } from "react";
import { Row } from "react-bootstrap";
import {
  ScorecardCategory,
  SelectedCategory,
} from "../../types/gameSetup.types";
import RadioButton from "../shared/RadioButton";

type Props = {
  away: string;
  home: string;
  onCategoryChange: (categories: SelectedCategory) => void;
  value: ScorecardCategory;
};

const Category: React.FC<Props> = ({
  away = "away",
  home = "home",
  onCategoryChange,
  value: category,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<SelectedCategory>({
    category: -1,
    category_value: -1,
  });

  const addOrUpdateCategory = (newCategory: SelectedCategory) => {
    console.log("addOrUpdateCategory newCategory.id", newCategory.category);
    if (newCategory.category_value !== selectedCategory.category_value) {
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
                category: category.id,
                category_value: valueId,
              })
            }
            text={currentValue.value}
            value={currentValue.id}
            checked={selectedCategory.category_value === currentValue.id}
          />
        ))}
      </Row>
    </>
  );
};
export default Category;
