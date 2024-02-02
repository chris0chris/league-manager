import { useLocation } from 'react-router';

function Error() {
  const {state} = useLocation();
const { message } = state;
console.log('message :>>', message)
  return (
    <>
    </>
  )
}

export default Error;
