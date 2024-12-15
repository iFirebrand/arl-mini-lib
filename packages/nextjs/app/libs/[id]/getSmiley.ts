export const getSmiley = (count: number) => {
  if (count === 0) return "😐"; // Neutral face for 0
  if (count === 1) return "🙂"; // Slightly smiling face
  if (count === 2) return "😊"; // Slightly more smiling
  if (count === 3) return "😄"; // Happy face
  if (count === 4) return "😁"; // Grinning face
  if (count === 5) return "😂"; // Laughing face
  if (count === 6) return "😃"; // Big smile
  if (count === 7) return "😅"; // Sweaty smile
  if (count === 8) return "😇"; // Smiling with halo
  if (count === 9) return "😍"; // Heart eyes
  if (count === 10) return "🤩"; // Star-struck
  if (count === 11) return "🥳"; // Party face
  if (count === 12) return "😜"; // Winking face
  if (count === 13) return "😝"; // Stuck out tongue
  if (count === 14) return "😻"; // Heart eyes cat
  if (count === 15) return "🤗"; // Hugging face
  if (count === 16) return "🤯"; // Exploding head
  if (count === 17) return "😱"; // Screaming in fear
  if (count === 18) return "😲"; // Astonished face
  if (count === 19) return "😳"; // Flushed face
  return "🎉"; // Party popper for 20 or more
};
