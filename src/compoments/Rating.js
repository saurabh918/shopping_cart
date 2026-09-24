import React from 'react';
import {AiFillStar,AiOutlineStar} from "react-icons/ai"

const Rating = ({rating,onClick,style}) => {
  const interactive = typeof onClick === "function";

  return (
    [...Array(5)].map((_,i)=>{
      const filled = rating > i;
      const icon = filled ? (
        <AiFillStar aria-hidden="true" fontSize="15px" />
      ) : (
        <AiOutlineStar aria-hidden="true" fontSize="15px" />
      );

      if (!interactive) {
        return (
          <span key={i} style={style}>
            {icon}
          </span>
        );
      }

      return (
        <button
          key={i}
          type="button"
          className="rating-star"
          style={style}
          aria-label={`${i + 1} star${i === 0 ? "" : "s"}`}
          aria-pressed={rating === i + 1}
          onClick={() => onClick(i)}
        >
          {icon}
        </button>
      );
    })
  )
}

export default Rating
