import { SyntheticEvent, useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import useNotification from "../../hooks/useNotification";
import { loadGameSetup, saveGameSetup } from "../../common/api/setup";
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
import { SelectedGame } from "../../types";
import { DASHBOARD_URL } from "../../common/routes";

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
  const [selectedGame, setSelectedGame] = useState<SelectedGame>({
    isSelected: false,
    gameId: -1,
  });
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
        setSelectedCategories(gameSetup.initial.categories);
        setSelectedOfficials(gameSetup.initial.officials);
      } catch (error: any) {
        console.log("error", error);
        setNotification({ text: error.message });
      }
    };
    const gameId = searchParams.get("gameId");
    if (gameId) {
      const gameIdAsInt = parseInt(gameId);
      setSelectedGame({ gameId: gameIdAsInt, isSelected: false });
      fetchData(gameIdAsInt);
    }
  }, [searchParams]);
  const addOrUpdateOfficial = (newOfficial: SelectedOfficial) => {
    setSelectedOfficials((prevOfficials) => {
      const existingPosition = prevOfficials.some(
        (official) => official.position === newOfficial.position,
      );
      if (existingPosition) {
        return prevOfficials.map((official) =>
          official.official === newOfficial.official
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
        (category) => category.category === newCategory.category,
      );
      if (existingCategory) {
        return prevCategories.map((category) =>
          category.category === newCategory.category
            ? { ...category, category_value: newCategory.category_value }
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
        (selectedOfficial) => selectedOfficial.official === item.id,
      ),
  );
  // setTeamOfficials(filteredOfficials);
  const handleSubmit = async (event: SyntheticEvent) => {
    event.preventDefault();
    console.log("event", event, selectedCategories, selectedOfficials);
    try {
      await saveGameSetup(selectedGame.gameId, {
        officials: selectedOfficials,
        categories: selectedCategories,
      });
      setSelectedGame({
        ...selectedGame,
        isSelected: true,
      });
    } catch (error: any) {
      setNotification({ text: error.message });
    }
  };
  const officialsAsDropdownItem = filteredOfficials.map(
    InputDropdownItemFactory.createFromOfficial,
  );
  console.log("selectedObjects", selectedCategories, selectedOfficials);
  if (selectedGame.isSelected) {
    return <Navigate to={`${DASHBOARD_URL}?gameId=${selectedGame.gameId}`} />;
  }
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
                official: id,
                position: currentOfficialPosition.position_name,
                official_position: currentOfficialPosition.position_id,
              })
            }
            onReset={() =>
              resetSelectedOfficials(currentOfficialPosition.position_name)
            }
            initialValue={
              selectedOfficials.find(
                (selected) =>
                  selected.position === currentOfficialPosition.position_name,
              )?.name || ""
            }
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
