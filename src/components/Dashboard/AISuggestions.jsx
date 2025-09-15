import React from 'react'

function AISuggestions() {
  return (
    <div className="border border-white border-0.3 p-5 bg-[#9cc8e5] rounded-lg">
      <h1 className="mb-2 font-bold flex gap-2 text-xl">
        <svg
          stroke="currentColor"
          fill="currentColor"
          stroke-width="0"
          viewBox="0 0 20 20"
          height="1em"
          width="1em"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill-rule="evenodd"
            d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z"
            clip-rule="evenodd"
          ></path>
        </svg>
        AI Suggestion
      </h1>
      <div>
        <p className="[box-shadow:rgba(128,128,128,0.5)_3px_3px_6px_0px_inset,rgba(255,255,255,0.5)_-3px_-3px_6px_1px_inset] rounded-lg p-3">
          Lorem ipsum dolor, sit amet consectetur adipisicing elit. Ipsum,
          asperiores. Ipsam quibusdam eius laboriosam in quis repudiandae
          voluptatem. Voluptatibus quae sapiente dignissimos consequuntur?
          Voluptate nesciunt tempora eius repellendus temporibus nam.
        </p>
      </div>
    </div>
  );
}

export default AISuggestions