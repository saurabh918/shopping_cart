import React from 'react';
import {AiFillStar,AiOutlineStar} from "react-icons/ai"

const Rating = ({rating,onClick,style}) => {
  console.log(rating)
  return (
    [...Array(5)].map((_,i)=>(
       <span onClick={()=>onClick(i)} style={style} key={i}>
        {rating > i ? (
          <AiFillStar fontSize="15px" />
        ):(
          <AiOutlineStar fontSize="15px" />
        )}
      </span>
    ))
  )
}

export default Rating