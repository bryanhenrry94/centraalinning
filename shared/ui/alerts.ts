import swal from "sweetalert";

export class AlertService {
  static showSuccess(message: string): void {
    swal("Éxito", message, "success");
  }

  static showError(message: string): void {
    swal("Error", message, "error");
  }

  static showInfo(message: string): void {
    swal("Información", message, "info");
  }

  static showWarning(message: string): void {
    swal("Advertencia", message, "warning");
  }

  static showErrorWithCallback(message: string, callback: () => void): void {
    swal("Error", message, "error").then(() => {
      callback();
    });
  }

  static showConfirm(
    title: string,
    message: string,
    confirmButtonText = "Sí",
    cancelButtonText = "Cancelar"
  ): Promise<boolean> {
    return swal({
      title,
      text: message,
      icon: "warning",
      buttons: {
        confirm: {
          text: confirmButtonText,
        },
        cancel: {
          text: cancelButtonText,
          visible: true,
        },
      },
      dangerMode: true,
    }).then((confirmed) => Boolean(confirmed));
  }

  static showConfirmWithInput(
    title: string,
    message: string,
    confirmButtonText = "Sí",
    cancelButtonText = "Cancelar"
  ): Promise<string | null> {
    // Uses a real input element so we can enable/disable the confirm button based on input content
    const input = document.createElement("input");
    input.className = "swal-content__input";
    input.type = "text";
    input.placeholder = "";
    input.value = "";

    // will hold a cleanup function to remove the input listener
    let removeListener: (() => void) | null = null;

    // After swal inserts the content into the DOM, enable/disable the confirm button based on input
    // and attach an input listener to toggle the button.
    // A short timeout is used so that swal has time to render its buttons.
    setTimeout(() => {
      const confirmBtn = document.querySelector(
        ".swal-button--confirm"
      ) as HTMLButtonElement | null;
      if (!confirmBtn) return;
      // disable by default until there's text
      confirmBtn.disabled = !input.value.trim();
      const handler = () => {
        confirmBtn.disabled = !input.value.trim();
      };
      input.addEventListener("input", handler);
      removeListener = () => input.removeEventListener("input", handler);
      // focus the input for better UX
      input.focus();
    }, 0);

    return swal({
      title,
      text: message,
      content: { element: input },
      icon: "warning",
      buttons: {
        cancel: {
          text: cancelButtonText,
          visible: true,
        },
        confirm: {
          text: confirmButtonText,
        },
      },
      dangerMode: true,
    })
      .then((value) => {
        // sweetalert returns null when cancelled
        if (value === null) return null;
        // when confirmed, return the input's current value
        return String(input.value);
      })
      .finally(() => {
        // cleanup listener and ensure confirm button is enabled again
        if (removeListener) removeListener();
        const confirmBtn = document.querySelector(
          ".swal-button--confirm"
        ) as HTMLButtonElement | null;
        if (confirmBtn) confirmBtn.disabled = false;
      });
  }
}
