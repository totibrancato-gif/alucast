"use strict";
// =========================================================================
// Lista de precios de fábrica: la que cargó el usuario (copia del 24/10/2026).
// Es la lista con la que arranca la app y a la que vuelve "Volver a los precios de la planilla".
// =========================================================================
const LISTA_FABRICA = {
    "barra":  6.8,
    "acabados":  {
                     "Negro":  12,
                     "Gris":  10.5,
                     "Anolok":  14
                 },
    "lineas":  [
                   {
                       "n":  "Probba",
                       "perfiles":  [
                                        {
                                            "n":  "RIEL PROBBA",
                                            "kgm":  0.921
                                        },
                                        {
                                            "n":  "LATERAL MARCO",
                                            "kgm":  0.554
                                        },
                                        {
                                            "n":  "ENGANCHE HOJA",
                                            "kgm":  0.615
                                        },
                                        {
                                            "n":  "LATERAL HOJA",
                                            "kgm":  0.62
                                        },
                                        {
                                            "n":  "DIVISOR HOJA",
                                            "kgm":  0.6
                                        },
                                        {
                                            "n":  "HOJA MOSQUITERO",
                                            "kgm":  0.53
                                        },
                                        {
                                            "n":  "RIEL MOSQUITERO",
                                            "kgm":  0.32
                                        }
                                    ],
                       "accesorios":  [
                                          {
                                              "n":  "MANIJAS",
                                              "usd":  0.4
                                          },
                                          {
                                              "n":  "RUEDAS 40Kg",
                                              "usd":  1.68
                                          },
                                          {
                                              "n":  "CIERRE LARA",
                                              "usd":  1.5
                                          },
                                          {
                                              "n":  "TAPON",
                                              "usd":  0.55
                                          },
                                          {
                                              "n":  "DISPOSITIVO",
                                              "usd":  0.9
                                          },
                                          {
                                              "n":  "CUBRE DESAGUE",
                                              "usd":  0.5
                                          },
                                          {
                                              "n":  "BURLETE",
                                              "usd":  0.6
                                          },
                                          {
                                              "n":  "TEJIDO",
                                              "usd":  4.5
                                          },
                                          {
                                              "n":  "RUEDAS MOSQUITERO",
                                              "usd":  0.7
                                          },
                                          {
                                              "n":  "RUEDAS 80Kg",
                                              "usd":  3.8
                                          },
                                          {
                                              "n":  "CIERRE AUTOMATICO ",
                                              "usd":  7
                                          },
                                          {
                                              "n":  "CIERRE BIPUNTO",
                                              "usd":  110
                                          }
                                      ]
                   },
                   {
                       "n":  "Probba 3 guias",
                       "perfiles":  [
                                        {
                                            "n":  "RIEL 3 GUIAS",
                                            "kgm":  1.717,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11
                                                       }
                                        },
                                        {
                                            "n":  "LATERAL MARCO 3 GUIAS",
                                            "kgm":  1.191,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11
                                                       }
                                        },
                                        {
                                            "n":  "ENGANCHE HOJA",
                                            "kgm":  0.615
                                        },
                                        {
                                            "n":  "LATERAL HOJA",
                                            "kgm":  0.62
                                        },
                                        {
                                            "n":  "DIVISOR HOJA",
                                            "kgm":  0.6
                                        },
                                        {
                                            "n":  "DIVISOR 4504",
                                            "kgm":  0.51
                                        },
                                        {
                                            "n":  "HOJA MOSQUITERO ",
                                            "kgm":  0.53
                                        },
                                        {
                                            "n":  "RIEL MOSQUITERO ",
                                            "kgm":  0.32
                                        }
                                    ],
                       "accesorios":  [
                                          {
                                              "n":  "MANIJAS",
                                              "usd":  0.4
                                          },
                                          {
                                              "n":  "RUEDAS 40Kg",
                                              "usd":  1.68
                                          },
                                          {
                                              "n":  "CIERRE LARA",
                                              "usd":  1.5
                                          },
                                          {
                                              "n":  "TAPON",
                                              "usd":  0.55
                                          },
                                          {
                                              "n":  "DISPOSITIVO",
                                              "usd":  0.9
                                          },
                                          {
                                              "n":  "CUBRE DESAGUE",
                                              "usd":  0.5
                                          },
                                          {
                                              "n":  "BURLETE",
                                              "usd":  0.6
                                          },
                                          {
                                              "n":  "TEJIDO",
                                              "usd":  4.5
                                          },
                                          {
                                              "n":  "RUEDAS MOSQUITERO",
                                              "usd":  0.7
                                          },
                                          {
                                              "n":  "RUEDAS 80Kg",
                                              "usd":  3.8
                                          },
                                          {
                                              "n":  "CIERRE CON LLAVE",
                                              "usd":  20
                                          },
                                          {
                                              "n":  "CIERRE BIPUNTO",
                                              "usd":  110
                                          },
                                          {
                                              "n":  "CIERRE BIPUNTO CON LLAVE",
                                              "usd":  140
                                          },
                                          {
                                              "n":  "RUEDAS 120Kg",
                                              "usd":  6
                                          }
                                      ]
                   },
                   {
                       "n":  "Serie 20",
                       "perfiles":  [
                                        {
                                            "n":  "MARCO SUPERIOR",
                                            "kgm":  0.605
                                        },
                                        {
                                            "n":  "MARCO LATERAL",
                                            "kgm":  0.4
                                        },
                                        {
                                            "n":  "DIVISOR HOJA",
                                            "kgm":  0.4
                                        },
                                        {
                                            "n":  "ENGANCHE",
                                            "kgm":  0.473
                                        },
                                        {
                                            "n":  "LATERAL HOJA",
                                            "kgm":  0.432
                                        },
                                        {
                                            "n":  "RIEL MOSQUITERO",
                                            "kgm":  0.19
                                        },
                                        {
                                            "n":  "HOJA MOSQUITERO",
                                            "kgm":  0.25
                                        }
                                    ],
                       "accesorios":  [
                                          {
                                              "n":  "RUEDAS VERDE",
                                              "usd":  0.3
                                          },
                                          {
                                              "n":  "RUEDA RULEMAN",
                                              "usd":  1.25
                                          },
                                          {
                                              "n":  "MANIJAS",
                                              "usd":  0.4
                                          },
                                          {
                                              "n":  "CIERRE",
                                              "usd":  1.5
                                          },
                                          {
                                              "n":  "BURLETE",
                                              "usd":  0.6
                                          },
                                          {
                                              "n":  "CUBRE DESAGUE",
                                              "usd":  0.25
                                          },
                                          {
                                              "n":  "DISPOSITIVO",
                                              "usd":  0.9
                                          },
                                          {
                                              "n":  "TEJIDO",
                                              "usd":  4.5
                                          },
                                          {
                                              "n":  "MANIJA MOSQUITERO",
                                              "usd":  0.4
                                          },
                                          {
                                              "n":  "PATIN",
                                              "usd":  0.15
                                          },
                                          {
                                              "n":  "TAPON",
                                              "usd":  0.1
                                          }
                                      ]
                   },
                   {
                       "n":  "Mampara",
                       "vidrioDef":  "Acrílico",
                       "perfiles":  [
                                        {
                                            "n":  "RIEL SUPERIOR",
                                            "kgm":  0.691
                                        },
                                        {
                                            "n":  "RIEL INFERIOR",
                                            "kgm":  0.331
                                        },
                                        {
                                            "n":  "LATERAL HOJA",
                                            "kgm":  0.317
                                        },
                                        {
                                            "n":  "DIVISOR HOJA",
                                            "kgm":  0.344
                                        },
                                        {
                                            "n":  "LATERAL MARCO",
                                            "kgm":  0.265
                                        },
                                        {
                                            "n":  "TOALLERO",
                                            "kgm":  0.2
                                        }
                                    ],
                       "accesorios":  [
                                          {
                                              "n":  "RUEDAS MAMPARA",
                                              "usd":  1.7
                                          },
                                          {
                                              "n":  "SOPORTE TOALLERO",
                                              "usd":  0.4
                                          },
                                          {
                                              "n":  "GUIA ",
                                              "usd":  0.4
                                          },
                                          {
                                              "n":  "BURLETE",
                                              "usd":  0.6
                                          },
                                          {
                                              "n":  "SILICONA",
                                              "usd":  3
                                          },
                                          {
                                              "n":  "TOPE ANTIRUIDO",
                                              "usd":  0.6
                                          }
                                      ]
                   },
                   {
                       "n":  "SERIE 30",
                       "perfiles":  [
                                        {
                                            "n":  "MARCO",
                                            "kgm":  0.653
                                        },
                                        {
                                            "n":  "LATERAL HOJA",
                                            "kgm":  0.64
                                        },
                                        {
                                            "n":  "Z O T",
                                            "kgm":  0.807
                                        },
                                        {
                                            "n":  "DIVISOR FINO",
                                            "kgm":  0.553
                                        },
                                        {
                                            "n":  "DIVISOR GRUSO",
                                            "kgm":  0.877
                                        },
                                        {
                                            "n":  "CONTRA VIDRIO",
                                            "kgm":  0.122
                                        },
                                        {
                                            "n":  "TABLILLA",
                                            "kgm":  0.55
                                        }
                                    ],
                       "accesorios":  [
                                          {
                                              "n":  "BISAGRA",
                                              "usd":  3.7
                                          },
                                          {
                                              "n":  "CERRADURA",
                                              "usd":  23
                                          },
                                          {
                                              "n":  "BURLETE",
                                              "usd":  0.6
                                          },
                                          {
                                              "n":  "PASADOR",
                                              "usd":  25
                                          }
                                      ],
                       "vidrioDef":  "4mm"
                   },
                   {
                       "n":  "GALA CORREDIZA",
                       "perfiles":  [
                                        {
                                            "n":  "MARCO A45",
                                            "kgm":  1.064,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        },
                                        {
                                            "n":  "MARCO CORTE RECTO",
                                            "kgm":  1.256,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        },
                                        {
                                            "n":  "LATERAL MARCO",
                                            "kgm":  0.84,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        },
                                        {
                                            "n":  "DIVISOR HOJA",
                                            "kgm":  0.6,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        },
                                        {
                                            "n":  "LATERAL HOJA",
                                            "kgm":  0.759,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        },
                                        {
                                            "n":  "ENGANCHE HOJA",
                                            "kgm":  0.764,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        },
                                        {
                                            "n":  "RIEL MOSQUITERO",
                                            "kgm":  0.3,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        },
                                        {
                                            "n":  "HOJA MOSQUITERO LIVIANO",
                                            "kgm":  0.524,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        },
                                        {
                                            "n":  "HOJA MOSQUITERO PESADO",
                                            "kgm":  0.76,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        },
                                        {
                                            "n":  "DIVISOR HOJA 10CM",
                                            "kgm":  1.112,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        },
                                        {
                                            "n":  "RECIBIDOR 4 HOJAS",
                                            "kgm":  0.27,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        }
                                    ],
                       "accesorios":  [
                                          {
                                              "n":  "RUEDA 40Kg",
                                              "usd":  1.7
                                          },
                                          {
                                              "n":  "RUEDA 80Kg",
                                              "usd":  3.5
                                          },
                                          {
                                              "n":  "RUEDA 120Kg",
                                              "usd":  5.5
                                          },
                                          {
                                              "n":  "DISPOSITIVO",
                                              "usd":  1
                                          },
                                          {
                                              "n":  "CUBRE DESAGUE",
                                              "usd":  0.6
                                          },
                                          {
                                              "n":  "TAPON",
                                              "usd":  0.6
                                          },
                                          {
                                              "n":  "ESCUADRA DE TRACCION",
                                              "usd":  1.2
                                          },
                                          {
                                              "n":  "CIERRE BIPUNTO",
                                              "usd":  140
                                          },
                                          {
                                              "n":  "CIERRE BIPUNTO CON LLAVE",
                                              "usd":  160
                                          },
                                          {
                                              "n":  "CIERRE AUTOMATICO",
                                              "usd":  7
                                          },
                                          {
                                              "n":  "RUEDA MOSQUITERO",
                                              "usd":  1
                                          },
                                          {
                                              "n":  "BURLETE",
                                              "usd":  0.6
                                          },
                                          {
                                              "n":  "TEJIDO MOSQUITERO",
                                              "usd":  5
                                          },
                                          {
                                              "n":  "MANIJA MOSQUITERO",
                                              "usd":  0.4
                                          },
                                          {
                                              "n":  "CERRADURA CENTRAL CON LLAVE",
                                              "usd":  35
                                          }
                                      ]
                   },
                   {
                       "n":  "GALA CORREDIZA DVH",
                       "perfiles":  [
                                        {
                                            "n":  "MARCO A45",
                                            "kgm":  1.064,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        },
                                        {
                                            "n":  "MARCO CORTE RECTO",
                                            "kgm":  1.256,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        },
                                        {
                                            "n":  "LATERAL MARCO",
                                            "kgm":  0.84,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        },
                                        {
                                            "n":  "DIVISOR HOJA",
                                            "kgm":  0.725,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        },
                                        {
                                            "n":  "LATERAL HOJA",
                                            "kgm":  0.715,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        },
                                        {
                                            "n":  "ENGANCHE HOJA",
                                            "kgm":  0.72,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        },
                                        {
                                            "n":  "RIEL MOSQUITERO",
                                            "kgm":  0.3,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        },
                                        {
                                            "n":  "HOJA MOSQUITERO LIVIANO",
                                            "kgm":  0.524,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        },
                                        {
                                            "n":  "HOJA MOSQUITERO PESADO",
                                            "kgm":  0.76,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        },
                                        {
                                            "n":  "DIVISOR HOJA 10CM",
                                            "kgm":  1.112,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        },
                                        {
                                            "n":  "RECIBIDOR 4 HOJAS",
                                            "kgm":  0.27,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        }
                                    ],
                       "accesorios":  [
                                          {
                                              "n":  "RUEDA 40Kg",
                                              "usd":  1.7
                                          },
                                          {
                                              "n":  "RUEDA 80Kg",
                                              "usd":  3.5
                                          },
                                          {
                                              "n":  "RUEDA 120Kg",
                                              "usd":  5.5
                                          },
                                          {
                                              "n":  "DISPOSITIVO",
                                              "usd":  1
                                          },
                                          {
                                              "n":  "CUBRE DESAGUE",
                                              "usd":  0.6
                                          },
                                          {
                                              "n":  "TAPON",
                                              "usd":  0.6
                                          },
                                          {
                                              "n":  "ESCUADRA DE TRACCION",
                                              "usd":  1.2
                                          },
                                          {
                                              "n":  "CIERRE BIPUNTO",
                                              "usd":  140
                                          },
                                          {
                                              "n":  "CIERRE BIPUNTO CON LLAVE",
                                              "usd":  160
                                          },
                                          {
                                              "n":  "CIERRE AUTOMATICO",
                                              "usd":  7
                                          },
                                          {
                                              "n":  "RUEDA MOSQUITERO",
                                              "usd":  1
                                          },
                                          {
                                              "n":  "BURLETE",
                                              "usd":  0.6
                                          },
                                          {
                                              "n":  "TEJIDO MOSQUITERO",
                                              "usd":  5
                                          },
                                          {
                                              "n":  "MANIJA MOSQUITERO",
                                              "usd":  0.4
                                          },
                                          {
                                              "n":  "CERRADURA CENTRAL CON LLAVE",
                                              "usd":  35
                                          }
                                      ]
                   },
                   {
                       "n":  "GALA BATIENTE",
                       "perfiles":  [
                                        {
                                            "n":  "MARCO ",
                                            "kgm":  0.7,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        },
                                        {
                                            "n":  "HOJA T",
                                            "kgm":  1.16,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        },
                                        {
                                            "n":  "HOJA Z",
                                            "kgm":  1.26,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        },
                                        {
                                            "n":  "DIVISOR HOJA",
                                            "kgm":  1.22,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        },
                                        {
                                            "n":  "CONTRAVIDRIO",
                                            "kgm":  0.25,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        },
                                        {
                                            "n":  "ENCUENTRO",
                                            "kgm":  0.67,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        },
                                        {
                                            "n":  "HOJA T GRANDE",
                                            "kgm":  1.47,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        },
                                        {
                                            "n":  "HOJA Z GRANDE",
                                            "kgm":  1.47,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        },
                                        {
                                            "n":  "ZOCALO",
                                            "kgm":  0.4,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        },
                                        {
                                            "n":  "CLIP",
                                            "kgm":  0.1,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        },
                                        {
                                            "n":  "TABLILLA LIVIANA",
                                            "kgm":  0.55,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        },
                                        {
                                            "n":  "TABLILLA PESADA",
                                            "kgm":  0.76,
                                            "precio":  {
                                                           "Negro":  13,
                                                           "Gris":  11.5
                                                       }
                                        }
                                    ],
                       "accesorios":  [
                                          {
                                              "n":  "BISAGRA 3 ALAS",
                                              "usd":  11
                                          },
                                          {
                                              "n":  "CERRADURA",
                                              "usd":  25
                                          },
                                          {
                                              "n":  "BURLETE",
                                              "usd":  0.6
                                          },
                                          {
                                              "n":  "PASADOR",
                                              "usd":  40
                                          }
                                      ]
                   },
                   {
                       "n":  "PROBBA BATIENTE",
                       "perfiles":  [
                                        {
                                            "n":  "MARCO",
                                            "kgm":  0.61
                                        },
                                        {
                                            "n":  "HOJA Z",
                                            "kgm":  0.94
                                        },
                                        {
                                            "n":  "HOJA T",
                                            "kgm":  0.94
                                        },
                                        {
                                            "n":  "CONTRAVIDRIO",
                                            "kgm":  0.25
                                        },
                                        {
                                            "n":  "ZOCALO",
                                            "kgm":  0.4
                                        },
                                        {
                                            "n":  "DIVISOR",
                                            "kgm":  1.22
                                        },
                                        {
                                            "n":  "HOJA PROYECTANTE",
                                            "kgm":  0.66
                                        },
                                        {
                                            "n":  "HOJA TABAQUERA",
                                            "kgm":  0.66
                                        },
                                        {
                                            "n":  "GOTERO",
                                            "kgm":  0.12
                                        }
                                    ],
                       "accesorios":  [
                                          {
                                              "n":  "BISAGRA 3 ALAS",
                                              "usd":  11.3
                                          },
                                          {
                                              "n":  "CERRADURA",
                                              "usd":  25
                                          },
                                          {
                                              "n":  "BISAGRA 2 ALAS",
                                              "usd":  7
                                          },
                                          {
                                              "n":  "BRAZO DE EMPUJE",
                                              "usd":  8
                                          },
                                          {
                                              "n":  "BRAZO LIMITADOR",
                                              "usd":  20
                                          },
                                          {
                                              "n":  "ESCUADRA DE TRACCION",
                                              "usd":  1.7
                                          },
                                          {
                                              "n":  "PASADORES",
                                              "usd":  39
                                          },
                                          {
                                              "n":  "CIERRE TABAQUERA",
                                              "usd":  4
                                          },
                                          {
                                              "n":  "ESCUADRA APL4600",
                                              "usd":  0.9
                                          },
                                          {
                                              "n":  "BURLETE",
                                              "usd":  0.6
                                          },
                                          {
                                              "n":  "CUBRE DESAGUE",
                                              "usd":  0.55
                                          },
                                          {
                                              "n":  "BRAZO HIDRAULICO",
                                              "usd":  75
                                          }
                                      ]
                   }
               ],
    "vidrios":  [
                    {
                        "n":  "4mm",
                        "usd":  14
                    },
                    {
                        "n":  "5mm",
                        "usd":  18
                    },
                    {
                        "n":  "6mm",
                        "usd":  22
                    },
                    {
                        "n":  "OPACID",
                        "usd":  35
                    },
                    {
                        "n":  "LAMINADO 3+3",
                        "usd":  40
                    },
                    {
                        "n":  "FANTASIA",
                        "usd":  25
                    },
                    {
                        "n":  "Acrílico",
                        "usd":  0,
                        "unidad":  true
                    }
                ]
};
