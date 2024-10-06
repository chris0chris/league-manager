import { Button, Col, FloatingLabel, Form, Row } from "react-bootstrap";
import { InputDropdownItem } from "../../types";
import { useEffect, useRef, useState } from "react";

type Props = {
  focus?: boolean;
  id: string;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  initialValue?: string;
  itemLimit?: number;
  items: InputDropdownItem[];
  label: string;
  onReset: () => void;
  onSelected: (id: number | null, text: string) => void;
  placeholder?: string;
  type?: "text" | "number";
};

const InputDropdown: React.FC<Props> = ({
  focus = false,
  id,
  initialValue = "",
  isDisabled = false,
  isReadOnly = false,
  isRequired = false,
  itemLimit = 5,
  items = [],
  label,
  onReset,
  onSelected,
  placeholder = null,
  type = "text",
}) => {
  const [hasFocus, setHasFocus] = useState<boolean>(focus);
  const [disabled, setDisabled] = useState(isDisabled);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (initialValue) {
      setInputValue(initialValue);
      setDisabled(true);
      setHasFocus(false);
    }
  }, [initialValue]);

  if (!placeholder) {
    placeholder = label;
  }
  const handleSelection = (selectedItem: InputDropdownItem) => {
    setInputValue(selectedItem.text);
    onSelected(selectedItem.id, selectedItem.text);
    setDisabled(true);
    setHasFocus(false);
  };
  const reset = () => {
    setDisabled(false);
    setInputValue("");
    setHasFocus(true);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
    onReset();
  };
  const checkText = (item: string, input: string) => {
    const pattern = input
      .split("")
      .map((character) => `${character}.*`)
      .join("");
    const regex = new RegExp(pattern, "gi");
    return item.match(regex);
  };
  const filteredItems = items.filter((item) => {
    return checkText(item.text, inputValue);
  });
  let itemsToDisplay = inputValue ? filteredItems : items;
  itemsToDisplay = itemsToDisplay.slice(0, itemLimit);
  return (
    <div>
      <div className="mt-2" style={{ position: "relative" }}>
        {/* {!displaySearchInput && ( */}
        <Row className="mt-2">
          <Col>
            <Form.Floating
              className="mt-3"
              // @ts-expect-error: --bs-body-bg is a bootstrap element
              style={{ "--bs-body-bg": "transparent" }}
            >
              <Form.Control
                ref={inputRef}
                autoFocus={hasFocus}
                type={type}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={() => {
                  console.log("setHasFocus FALSE", label);
                  setHasFocus(false);
                }}
                onFocus={() => {
                  console.log("setHasFocus TRUE", label);
                  setHasFocus(true);
                }}
                placeholder={placeholder} // required for FloatingLabel to work correctly
                required={isRequired}
                readOnly={isReadOnly}
                disabled={disabled}
                // style={{ display: show ? "block" : "none" }}
              />
              <label htmlFor={id}>{`${label}${isRequired ? "*" : ""}`}</label>
            </Form.Floating>
            {hasFocus && (
              <ul
                className="list-group"
                style={{
                  position: "absolute",
                  zIndex: 99,
                  width: "100%",
                  // display: displaySuggestionBox ? "block" : "none",
                }}
              >
                {itemsToDisplay.map((item, index) => (
                  <li
                    key={index}
                    className="list-group-item bg-light"
                    onMouseDown={() => {
                      console.log("onMouseDown", item.text, item.id);
                      handleSelection(item);
                    }}
                  >
                    <div className="row">
                      <div className="col-9">{item.text}</div>
                      <div
                        className="col-3 text-end text-muted ps-0 pe-0"
                        style={{ fontSize: "x-small" }}
                      >
                        {item.subtext}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Col>
          {disabled && (
            <Col xs={3} className="d-grid">
              <Button
                type="reset"
                variant="danger"
                onClick={reset}
                className="mt-3"
              >
                <i className="bi bi-trash-fill"></i>
              </Button>
            </Col>
          )}
        </Row>
      </div>
    </div>
  );
};
export default InputDropdown;
