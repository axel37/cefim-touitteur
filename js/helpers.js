// Misc functions

export {formatDate}

/*
    Converts a timestamp (UNIX Epoch) to a formatted string (such as "Lun. 15 fév. 2022 10h35")
 */
function formatDate(number)
{
    let date = new Date(number);

    let day = formatDay(date.getDay());
    let dayN = date.getDate();
    let month = formatMonth(date.getMonth());
    let year = date.getFullYear();

    let hour = String(date.getHours()).padStart(2, "0");
    let min = String(date.getMinutes()).padStart(2, "0");

    return day + " " + dayN + " " + month + " " + year + " " + hour + ":" + min;
}

/*
    Returns (abbreviated) month name from its number
 */
function formatMonth(mth)
{
    let string = "";

    switch (mth) {
        case 0:
            string = "Jan.";
            break;
        case 1:
            string = "Fév.";
            break;
        case 2:
            string = "Mar.";
            break;
        case 3:
            string = "Avr.";
            break;
        case 4:
            string = "Mai";
            break;
        case 5:
            string = "Juin";
            break;
        case 6:
            string = "Juil.";
            break;
        case 7:
            string = "Août";
            break;
        case 8:
            string = "Sep.";
            break;
        case 9:
            string = "Oct.";
            break;
        case 10:
            string = "Nov.";
            break;
        case 11:
            string = "Déc.";
            break;
    }

    return string;
}

/*
    Returns (abbreviated) day name from its number
 */
function formatDay(day)
{
    let string = "";

    switch (day) {
        case 0:
            string = "Dim.";
            break;
        case 1:
            string = "Lun.";
            break;
        case 2:
            string = "Mar.";
            break;
        case 3:
            string = "Mer.";
            break;
        case 4:
            string = "Jeu.";
            break;
        case 5:
            string = "Ven.";
            break;
        case 6:
            string = "Sam.";
            break;
    }

    return string;
}