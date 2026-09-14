import jsPDF from "jspdf";
import JsBarcode from "jsbarcode";


interface LabelData {
  codigo:string;
  talla:string;
}


export const generateLabelsPDF = (labels:LabelData[]) => {


const pdf = new jsPDF({
    orientation:"landscape",
    unit:"mm",
    format:[50,25]
});



labels.forEach((item,index)=>{


    if(index !== 0){

        pdf.addPage([50,25],"landscape");

    }



    const canvas=document.createElement("canvas");


    // Aumentar resolución del canvas
    canvas.width = 600;
    canvas.height = 200;



    JsBarcode(canvas,
        `${item.codigo}'${item.talla}`,
        {
            format:"CODE128",

            width:3,

            height:120,

            displayValue:false,

            margin:20,

            background:"#ffffff",

            lineColor:"#000000"
        }
    );



    const barcode = canvas.toDataURL(
        "image/png",
        1.0
    );



    // Código de barras más grande
    pdf.addImage(
        barcode,
        "PNG",
        4,
        3,
        42,
        12
    );



    // Texto inferior
    pdf.setFont("helvetica","bold");

    pdf.setFontSize(11);



    pdf.text(
        `${item.codigo}'${item.talla}`,
        25,
        21,
        {
            align:"center"
        }
    );


});



pdf.save("etiquetas_stock.pdf");


};