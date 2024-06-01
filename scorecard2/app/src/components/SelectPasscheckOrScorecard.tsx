import { useEffect, useState } from "react";
import { getPasscheckStatus } from "../common/api/config";
import { Navigate } from "react-router-dom";
import { SELECT_GAME_URL } from "../common/routes";
import { Button, Col, Container, Row } from "react-bootstrap";
import { navigateTo } from "../common/utils";

const SelectPasscheckOrScorecard: React.FC = () => {
  const [redirectToScorecard, setRedirectToScorecard] = useState(false);
  const [isPasscheckStatusCompleted, setIsPasscheckStatusCompleted] =
    useState(false);

  useEffect(() => {
    const fetchPasscheckStatus = async () => {
      try {
        const status = await getPasscheckStatus();
        setIsPasscheckStatusCompleted(status);
      } catch (error) {
        console.error("Error fetching passcheck status:", error);
      }
    };

    fetchPasscheckStatus();
  }, [isPasscheckStatusCompleted]);

  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    event.preventDefault();
    event.returnValue = "";
  };

  useEffect(() => {
    window.removeEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.addEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const redirectToPasscheck = () => {
    console.log("redirecting to passcheck");
    navigateTo("/passcheck");
  };
  if (redirectToScorecard || isPasscheckStatusCompleted) {
    return <Navigate to={SELECT_GAME_URL} />;
  }
  return (
    <Container
      className="d-flex justify-content-center"
      style={{ height: "100vh" }}
    >
      <Row>
        <Col>
          <Button
            className="m-2"
            size="lg"
            variant="primary"
            onClick={redirectToPasscheck}
          >
            Passcheck
          </Button>
          <Button
            className="m-2"
            size="lg"
            variant="secondary"
            onClick={() => setRedirectToScorecard(true)}
          >
            Scorecard
          </Button>
        </Col>
      </Row>
    </Container>
  );
};
export default SelectPasscheckOrScorecard;
