import { ButtonGroup, ToggleButton } from "react-bootstrap";

type Props = {
  id: string;
  required?: boolean;
  name: string;
  onChange: (valueId: number) => void;
  text: string;
  value?: number;
  color?: string;
  checked?: boolean;
  className?: string;
};

const RadioButton: React.FC<Props> = ({
  id,
  required = false,
  name,
  onChange: setValue,
  text,
  value,
  color = "secondary",
  checked = false,
  className = "",
}) => {
  return (
    <ButtonGroup className={`col d-grid ${className}`}>
      <input
        type="radio"
        className={`btn-check outline-${color}`}
        // name={name}
        // id={id}
        autoComplete="off"
        defaultValue={value ? value : text}
        onChange={(ev) => setValue(parseInt(ev.currentTarget.value))}
        checked={checked}
        required={required}
        data-testid={value ? value : text}
      />
      <label
        className={`btn btn-outline-${color}`}
        htmlFor={id}
        dangerouslySetInnerHTML={{ __html: text }}
      />
    </ButtonGroup>
  );
};

export default RadioButton;
