import React, { useState } from "react";

function DynamicDropdown({ options }) {
  const [isOpen, setIsOpen] = useState(false);
  const toggleDropdown = () => setIsOpen(!isOpen);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={toggleDropdown}
        style={{ padding: "10px", cursor: "pointer" }}
      >
        Select an Option
      </button>
      {isOpen && (
        <ul
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            backgroundColor: "#fff",
            border: "1px solid #ccc",
            listStyle: "none",
            padding: "10px",
            margin: 0,
            width: "150px",
          }}
        >
          {options.map((option, index) => (
            <li key={index} style={{ padding: "5px 0", cursor: "pointer" }}>
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default DynamicDropdown;

// export default function App() {
//   const options = ["Option A", "Option B", "Option C"];
//   return <DynamicDropdown options={options} />;
// }
