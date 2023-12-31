import { db } from "@/lib/db";
import { ProductValidator } from "@/lib/validators/product-validator";
import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET(
    req: Request, {params}: {params: {productId: string}}) {
    try {
    
        if (!params.productId) {
            return new NextResponse('Product Id is required', {status: 400})
        }

        const product = await db.product.findUnique({
            where: {
                id: params.productId 
            },
            include: {
                images: true,
                category: true,
                size: true,
                color: true,
            }
        })

        return NextResponse.json(product);
        
    } catch (error) {
        
        if (error instanceof z.ZodError) {
            return new NextResponse('Invalid request data passed', {status: 422} )
        }

        return new NextResponse(
            'Could not post to store at this time, try again later', 
            {
                status: 500
            }
        )
    }
}

export async function PATCH(
     req: Request, {params}: {params: {storeId: string, productId: string}}) {
    try {
        const  { userId } = auth()

         const body = await req.json()
         const { 
            name,
            images, 
            price, 
            categoryId, 
            colorId, 
            sizeId, 
            isArchived, 
            isFeatured
          } = ProductValidator.parse(body);

        if (!userId) {
            return new NextResponse('Unauthticated', {status: 401})
        }

        if (!params.productId) {
            return new NextResponse('Product Id is required', {status: 400})
        }
        
        if (!name) {
            return new NextResponse('Name is required', {status: 400})
        }
        if (!images || !images.length) {
            return new NextResponse('Images are required', {status: 400})
        }
        if (!price) {
            return new NextResponse('Price is required', {status: 400})
        }
        if (!categoryId) {
            return new NextResponse('Category Id is required', {status: 400})
        }
        if (!colorId) {
            return new NextResponse('Color Id is required', {status: 400})
        }
        if (!sizeId) {
            return new NextResponse('Size Id is required', {status: 400})
        }
        

        const storeByUserId = await db.store.findFirst({
            where: {
                id: params.storeId,
                userId
            }
        })

        if (!storeByUserId) {
            return new NextResponse('Unauthorised', {status: 405})
        }

        await db.product.update({
            where: {
                id: params.productId,
            },
            data: {
                name, 
                price, 
                categoryId, 
                colorId, 
                sizeId, 
                images: {
                    deleteMany: {}
                },
                isArchived, 
                isFeatured,
            },
        });

        const product = await db.product.update({
            where: {
                id: params.productId,
            },
            data: {
                images: {
                    createMany: {
                        data: [
                            ...images.map((image: {url:string}) => image ),
                        ],
                    },
                },
            },
        })
        return NextResponse.json(product);
        
    } catch (error) {
        
    console.log('[PRODUCT_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
    
    }
}

export async function DELETE(
    req: Request,
    {params}: {params: {storeId: string, productId: string}}
    ) {

    try {

        const {  userId } = auth();

        if ( !userId ) {
            return new NextResponse('Unauthenticated', {status: 401})
        }
    
        if (!params.productId) {
            return new NextResponse('Product Id is required', {status: 400})
        }

        const storeByUserId = await db.store.findFirst({
            where: {
                id: params.storeId,
                userId
            }
        });

        if (!storeByUserId) {
            return new NextResponse('Unauthorised', {status: 403})
        }


        const product = await db.product.delete({
            where: {
                id: params.productId 
            }
        });

        return NextResponse.json(product);
        
    } catch (error) {
        
        console.log('[PRODUCT_DELETE]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
}