import { useState } from "react";
import { Container, Card, Form, Button, FloatingLabel } from "react-bootstrap";
import { login } from "../common/api/auth";
import { Navigate } from "react-router-dom";
import { SELECT_APP_URL } from "../common/routes";
import useNotification from "../hooks/useNotification";

const Login: React.FC = () => {
  const { setNotification } = useNotification();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [redirectToNextPage, setRedirectToNextPage] = useState(false);
  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await login(username, password);
      setRedirectToNextPage(true);
    } catch (error: any) {
      console.log("catching error", error);
      setNotification({ text: error.message });
    }
  };

  if (redirectToNextPage) {
    return <Navigate to={SELECT_APP_URL} />;
  }

  return (
    <Container className="col-md-6 m-auto">
      <Card className="card-body mt-5">
        <h2 className="text-center">Login</h2>
        <Form onSubmit={onSubmit}>
          <Form.Group className="form-group" controlId="formUsername">
            <FloatingLabel label="Username" controlId="formUsername">
              <Form.Control
                type="text"
                name="username"
                onChange={(e) => setUsername(e.target.value)}
                value={username}
                placeholder="Username"
                required
              />
            </FloatingLabel>
          </Form.Group>
          <Form.Group className="form-group mt-3" controlId="formPassword">
            <FloatingLabel label="Passwort" controlId="formPassword">
              <Form.Control
                type="password"
                name="password"
                onChange={(e) => setPassword(e.target.value)}
                value={password}
                placeholder="Passwort"
                required
              />
            </FloatingLabel>
          </Form.Group>
          <Form.Group className="form-group d-grid mt-3">
            <Button type="submit" className="btn btn-primary">
              Anmelden
            </Button>
          </Form.Group>
          <div className="mt-3">
            Du hast keine Login-Daten? Oh, oh ... bitte an dein Teammanagement
            oder die Ligaorganisation wenden.
          </div>
        </Form>
      </Card>
    </Container>
  );
};

export default Login;
