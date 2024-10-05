import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import useNotification from "../../hooks/useNotification";
import { loadGameSetup } from "../../common/api/setup";
import {
  GameInfo,
  GameSetup,
  Official,
  ScorecardConfig,
  SelectedCategory,
  SelectedOfficial,
} from "../../types/gameSetup.types";
import { Button, Col, Form, Row } from "react-bootstrap";
import InputDropdown from "../shared/InputDropdown";
import { InputDropdownItemFactory } from "../../common/factories/input-dropdown.factory";
import Category from "./Category";

const Officials: React.FC = () => {
  const { setNotification } = useNotification();
  const [searchParams, setSearchParams] = useSearchParams();
  const [scorecardConfig, setScorecardConfig] = useState<ScorecardConfig>({
    categories: [],
    officials: [],
  });
  const [teamOfficials, setTeamOfficials] = useState<Official[]>([]);
  const [selectedOfficials, setSelectedOfficials] = useState<
    SelectedOfficial[]
  >([]);
  const [selectedCategories, setSelectedCategories] = useState<
    SelectedCategory[]
  >([]);
  const [gameInfo, setGameInfo] = useState<GameInfo>({
    away: "away",
    field: 0,
    home: "home",
    scheduled: "00:00",
    stage: "Runde ?",
    standing: "Gruppe ?",
  });
  useEffect(() => {
    const fetchData = async (gameId: number) => {
      try {
        const gameSetup: GameSetup = await loadGameSetup(gameId);
        setScorecardConfig(gameSetup.scorecard);
        setTeamOfficials(gameSetup.teamOfficials);
        setGameInfo(gameSetup.gameInfo);
      } catch (error: any) {
        console.log("error", error);
        setNotification({ text: error.message });
      }
    };
    const gameId = searchParams.get("gameId");
    if (gameId) {
      fetchData(parseInt(gameId));
    }
  }, [searchParams]);
  const addOrUpdateOfficial = (newOfficial: SelectedOfficial) => {
    setSelectedOfficials((prevOfficials) => {
      const existingPosition = prevOfficials.some(
        (official) => official.position === newOfficial.position,
      );
      if (existingPosition) {
        return prevOfficials.map((official) =>
          official.id === newOfficial.id
            ? { ...official, position: newOfficial.position }
            : official,
        );
      } else {
        return [...prevOfficials, newOfficial];
      }
    });
  };
  const addOrUpdateCategory = (newCategory: SelectedCategory) => {
    setSelectedCategories((prevCategories) => {
      const existingCategory = prevCategories.some(
        (category) => category.id === newCategory.id,
      );
      if (existingCategory) {
        return prevCategories.map((category) =>
          category.id === newCategory.id
            ? { ...category, valueId: newCategory.valueId }
            : category,
        );
      } else {
        return [...prevCategories, newCategory];
      }
    });
  };
  const resetSelectedOfficials = (position: string) => {
    setSelectedOfficials((prevOfficials) =>
      prevOfficials.filter((official) => official.position !== position),
    );
  };
  // const allOfficials = [...searchOffi, ...teamOffi];
  const filteredOfficials = teamOfficials.filter(
    (item) =>
      !selectedOfficials.some(
        (selectedOfficial) => selectedOfficial.id === item.id,
      ),
  );
  // setTeamOfficials(filteredOfficials);
  const handleSubmit = (event: any) => {
    event.preventDefault();
  };
  const officialsAsDropdownItem = filteredOfficials.map(
    InputDropdownItemFactory.createFromOfficial,
  );
  console.log("selectedObjects", selectedCategories, selectedOfficials);
  return (
    <>
      <div className="text-muted fs6">
        Feld {gameInfo.field} - {gameInfo.scheduled} Uhr / {gameInfo.stage}:{" "}
        {gameInfo.standing}
      </div>
      <h4 className="mt-2">
        {gameInfo.home} vs {gameInfo.away}
      </h4>
      <Form id="formId" onSubmit={handleSubmit}>
        {scorecardConfig.officials.map((currentOfficialPosition, index) => (
          <InputDropdown
            key={index}
            id={currentOfficialPosition.position_name + index}
            label={`${currentOfficialPosition.position_name} (Vorname Nachname)`}
            isRequired={!currentOfficialPosition.is_optional}
            focus={index === 0}
            onSelected={(id, text) =>
              addOrUpdateOfficial({
                name: text,
                id: id,
                position: currentOfficialPosition.position_name,
              })
            }
            onReset={() =>
              resetSelectedOfficials(currentOfficialPosition.position_name)
            }
            // initValues={scJudgeInit}
            // searchForText={searchForOfficials}
            items={officialsAsDropdownItem}
          />
        ))}
        {scorecardConfig.categories.map((currentCategory, index) => (
          <Category
            value={currentCategory}
            key={index}
            home={gameInfo.home}
            away={gameInfo.away}
            onCategoryChange={addOrUpdateCategory}
          />
        ))}
        <Row className="mt-3">
          <Col>
            <Button className="w-100" variant="primary" type="submit">
              Spiel starten
            </Button>
          </Col>
        </Row>
      </Form>
    </>
  );
};
export default Officials;
