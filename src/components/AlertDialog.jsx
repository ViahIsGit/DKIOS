import { useEffect, useRef } from 'react'

function AlertDialog({ open, title, message, onClose }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    if (dialogRef.current) {
      if (open) {
        dialogRef.current.show()
      } else {
        dialogRef.current.close()
      }
    }
  }, [open])

  const handleClose = () => {
    if (onClose) {
      onClose()
    }
  }

  return (
    <md-dialog ref={dialogRef} onClose={handleClose}>
      <div slot="headline">{title}</div>
      <form slot="content" method="dialog">
        <p>{message}</p>
      </form>
      <div slot="actions">
        <md-text-button onClick={handleClose}>OK</md-text-button>
      </div>
    </md-dialog>
  )
}

export default AlertDialog

